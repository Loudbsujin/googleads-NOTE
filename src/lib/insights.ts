// 자동 인사이트 코멘트 생성.
// 조회수 견인 관점: 어떤 캠페인/키워드가 조회수를 가장 많이 끌어왔는지,
// CPV 효율이 좋은/나쁜 항목은 무엇인지 텍스트로 요약한다.

import { GroupResult, Metrics } from "./metrics";

export interface Insight {
  type: "positive" | "warning" | "info";
  title: string;
  detail: string;
}

const fmtInt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const fmtCpv = (n: number) => `₩${n.toFixed(1)}`;
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;

export function buildInsights(
  total: Metrics,
  campaigns: GroupResult[],
  keywords: GroupResult[]
): Insight[] {
  const insights: Insight[] = [];

  // 1. 조회수 견인 1등 캠페인
  const byViews = [...campaigns].sort((a, b) => b.metrics.views - a.metrics.views);
  if (byViews.length > 0 && byViews[0].metrics.views > 0) {
    const top = byViews[0];
    const share = total.views > 0 ? top.metrics.views / total.views : 0;
    insights.push({
      type: "positive",
      title: `조회수 견인 1위: "${top.key}"`,
      detail: `전체 조회수의 ${fmtPct(share)}(${fmtInt(
        top.metrics.views
      )}회)를 이 캠페인이 견인했습니다. CPV ${fmtCpv(top.metrics.cpv)}, 조회율 ${fmtPct(
        top.metrics.viewRate
      )}.`,
    });
  }

  // 2. CPV 효율이 가장 좋은 캠페인 (조회수 100회 이상만)
  const eligible = campaigns.filter((c) => c.metrics.views >= 100);
  if (eligible.length > 1) {
    const cheapest = [...eligible].sort((a, b) => a.metrics.cpv - b.metrics.cpv)[0];
    insights.push({
      type: "positive",
      title: `가장 효율적인 캠페인: "${cheapest.key}"`,
      detail: `조회당 비용(CPV)이 ${fmtCpv(
        cheapest.metrics.cpv
      )}로 가장 저렴합니다. 예산을 늘려 조회수를 더 끌어올릴 여지가 있습니다.`,
    });

    // 3. CPV가 평균보다 크게 비싼 캠페인 경고
    const avgCpv = total.cpv;
    const expensive = [...eligible].sort((a, b) => b.metrics.cpv - a.metrics.cpv)[0];
    if (avgCpv > 0 && expensive.metrics.cpv > avgCpv * 1.5) {
      insights.push({
        type: "warning",
        title: `CPV 점검 필요: "${expensive.key}"`,
        detail: `CPV ${fmtCpv(
          expensive.metrics.cpv
        )}로 전체 평균(${fmtCpv(
          avgCpv
        )})보다 비쌉니다. 타겟팅·소재·입찰을 점검해 보세요.`,
      });
    }
  }

  // 4. 조회율 관점
  if (total.viewRate > 0) {
    const vrType = total.viewRate >= 0.15 ? "positive" : "info";
    insights.push({
      type: vrType,
      title: `전체 조회율 ${fmtPct(total.viewRate)}`,
      detail:
        total.viewRate >= 0.15
          ? "조회율이 양호합니다. 노출 대비 시청 전환이 잘 일어나고 있어요."
          : "조회율을 높이려면 썸네일·도입부 5초(훅)와 타겟 적합도를 개선해 보세요.",
    });
  }

  // 5. 조회수 견인 키워드 top
  const kwByViews = [...keywords].sort((a, b) => b.metrics.views - a.metrics.views);
  if (kwByViews.length > 0 && kwByViews[0].metrics.views > 0) {
    const topKw = kwByViews[0];
    insights.push({
      type: "info",
      title: `조회수 기여 키워드 1위: "${topKw.key}"`,
      detail: `${fmtInt(topKw.metrics.views)}회 조회를 견인했습니다 (CPV ${fmtCpv(
        topKw.metrics.cpv
      )}). 유사 키워드 확장을 검토해 보세요.`,
    });
  }

  return insights;
}
