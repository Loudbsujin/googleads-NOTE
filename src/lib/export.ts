// 다른 AI에 넘겨 분석하기 좋은 형태로 결과를 내보낸다.
// - Markdown 요약 (추천 프롬프트 동봉) -> 클립보드 복사
// - JSON / CSV 데이터 -> 파일 다운로드

import { GroupResult, Metrics, hasEarnedData, hasQuartileData } from "./metrics";
import { Insight } from "./insights";

const fmtInt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const fmtCpv = (n: number) => `₩${n.toFixed(1)}`;
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;
const fmtCost = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;

// AI가 바로 분석을 시작하도록 맨 앞에 붙이는 프롬프트.
const RECOMMENDED_PROMPT = `당신은 유튜브 채널 성장을 돕는 디지털 광고 전문가입니다.
아래는 Google Ads 광고 실적을 조회수 견인 관점으로 정리한 리포트입니다.
다음을 분석해 주세요.
1) 조회수를 가장 효율적으로 견인한 요소와 그 이유
2) 예산을 재배분한다면 어디를 늘리고 줄여야 하는지 (CPV/조회율 근거 포함)
3) 조회율과 CPV를 개선하기 위한 구체적 액션 3가지
4) 다음 리포트에서 추가로 확인하면 좋을 지표`;

export interface ExportInput {
  fileName: string;
  total: Metrics;
  campaigns: GroupResult[];
  keywords: GroupResult[];
  insights: Insight[];
}

function metricsTable(groups: GroupResult[], label: string): string {
  const header = `| 순위 | ${label} | 조회수 | 조회율 | CPV | 비용 |\n| --- | --- | ---: | ---: | ---: | ---: |`;
  const body = groups
    .map(
      (g, i) =>
        `| ${i + 1} | ${g.key} | ${fmtInt(g.metrics.views)} | ${fmtPct(
          g.metrics.viewRate
        )} | ${fmtCpv(g.metrics.cpv)} | ${fmtCost(g.metrics.cost)} |`
    )
    .join("\n");
  return `${header}\n${body}`;
}

export function buildMarkdown(input: ExportInput, withPrompt: boolean): string {
  const { fileName, total, campaigns, keywords, insights } = input;
  const topCampaigns = [...campaigns]
    .sort((a, b) => b.metrics.views - a.metrics.views)
    .slice(0, 10);
  const topKeywords = [...keywords]
    .sort((a, b) => b.metrics.views - a.metrics.views)
    .slice(0, 10);

  const sections: string[] = [];

  if (withPrompt) {
    sections.push(RECOMMENDED_PROMPT, "\n---\n");
  }

  sections.push(`# Google Ads 조회수 분석 리포트`);
  sections.push(`- 원본 파일: ${fileName}`);
  sections.push(`- 생성일: ${new Date().toLocaleDateString("ko-KR")}`);

  sections.push(`\n## 핵심 지표 요약`);
  sections.push(
    [
      `- 총 조회수: ${fmtInt(total.views)}회`,
      `- 조회당 비용(CPV): ${fmtCpv(total.cpv)}`,
      `- 조회율: ${fmtPct(total.viewRate)}`,
      `- 총 비용: ${fmtCost(total.cost)}`,
      `- 총 노출수: ${fmtInt(total.impressions)}`,
      `- 총 클릭수: ${fmtInt(total.clicks)} (CTR ${fmtPct(total.ctr)})`,
      `- CPM: ${fmtCost(total.cpm)}`,
      `- 전환수: ${fmtInt(total.conversions)}`,
    ].join("\n")
  );

  if (hasEarnedData(total)) {
    sections.push(`\n## 채널 성장 지표`);
    sections.push(
      [
        `- 획득 조회수: ${fmtInt(total.earnedViews)}회`,
        `- 획득 구독자: ${fmtInt(total.earnedSubscribers)}명`,
        `- 구독 견인율: ${fmtPct(total.subRate)}`,
      ].join("\n")
    );
  }

  if (hasQuartileData(total)) {
    sections.push(`\n## 동영상 시청 지속률 (노출 가중 평균)`);
    sections.push(
      [
        `- 25% 재생: ${fmtPct(total.vp25)}`,
        `- 50% 재생: ${fmtPct(total.vp50)}`,
        `- 75% 재생: ${fmtPct(total.vp75)}`,
        `- 100% 완시청: ${fmtPct(total.vp100)}`,
      ].join("\n")
    );
  }

  sections.push(`\n## 조회수 견인 캠페인 순위`);
  sections.push(metricsTable(topCampaigns, "캠페인"));

  if (topKeywords.length > 0) {
    sections.push(`\n## 조회수 기여 키워드 순위`);
    sections.push(metricsTable(topKeywords, "키워드"));
  }

  if (insights.length > 0) {
    sections.push(`\n## 자동 인사이트`);
    sections.push(
      insights.map((ins) => `- **${ins.title}** — ${ins.detail}`).join("\n")
    );
  }

  return sections.join("\n");
}

export function buildJson(input: ExportInput): string {
  const shape = (g: GroupResult) => ({ name: g.key, ...g.metrics });
  return JSON.stringify(
    {
      fileName: input.fileName,
      generatedAt: new Date().toISOString(),
      total: input.total,
      campaigns: input.campaigns.map(shape),
      keywords: input.keywords.map(shape),
      insights: input.insights,
    },
    null,
    2
  );
}

export function buildCsv(input: ExportInput): string {
  const headers = [
    "dimension",
    "name",
    "impressions",
    "views",
    "clicks",
    "cost",
    "conversions",
    "earnedViews",
    "earnedSubscribers",
    "viewRate",
    "cpv",
    "ctr",
    "cpc",
    "cpm",
    "subRate",
    "vp25",
    "vp50",
    "vp75",
    "vp100",
  ];
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const line = (dim: string, name: string, m: Metrics) =>
    [
      dim,
      name,
      m.impressions,
      m.views,
      m.clicks,
      m.cost,
      m.conversions,
      m.earnedViews,
      m.earnedSubscribers,
      m.viewRate.toFixed(4),
      m.cpv.toFixed(2),
      m.ctr.toFixed(4),
      m.cpc.toFixed(2),
      m.cpm.toFixed(2),
      m.subRate.toFixed(4),
      m.vp25.toFixed(4),
      m.vp50.toFixed(4),
      m.vp75.toFixed(4),
      m.vp100.toFixed(4),
    ]
      .map(escape)
      .join(",");

  const rows = [
    headers.join(","),
    line("total", "전체", input.total),
    ...input.campaigns.map((g) => line("campaign", g.key, g.metrics)),
    ...input.keywords.map((g) => line("keyword", g.key, g.metrics)),
  ];
  return rows.join("\n");
}

// 브라우저에서 텍스트를 파일로 다운로드.
export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob(["﻿" + content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
