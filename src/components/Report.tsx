"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  GroupResult,
  Metrics,
  NormalizedRow,
  groupBy,
  hasEarnedData,
  hasQuartileData,
} from "@/lib/metrics";
import { Insight } from "@/lib/insights";

interface Props {
  total: Metrics;
  campaigns: GroupResult[];
  ads: GroupResult[];
  adGroups: GroupResult[];
  keywords: GroupResult[];
  devices: GroupResult[];
  ages: GroupResult[];
  genders: GroupResult[];
  categoryComparison: GroupResult[];
  rows: NormalizedRow[];
  insights: Insight[];
}

const fmtInt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const fmtCpv = (n: number) => `₩${n.toFixed(1)}`;
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;
const fmtCost = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;
// "캠페인 › 그룹 › 광고명" 에서 마지막 조각(광고명)만 — 그래프 축 표시용
const shortLabel = (key: string) => key.split(" › ").pop() || key;

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

// 날짜별 추이 데이터 생성
function buildTrend(rows: NormalizedRow[]) {
  const byDate = groupBy(
    rows.filter((r) => r.date),
    "date"
  );
  return byDate
    .map((g) => ({
      date: g.key,
      views: g.metrics.views,
      cost: Math.round(g.metrics.cost),
      cpv: Number(g.metrics.cpv.toFixed(1)),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export default function Report({
  total,
  campaigns,
  ads,
  adGroups,
  keywords,
  devices,
  ages,
  genders,
  categoryComparison,
  rows,
  insights,
}: Props) {
  const trend = buildTrend(rows);
  const topCampaigns = [...campaigns]
    .sort((a, b) => b.metrics.views - a.metrics.views)
    .slice(0, 8);
  const topAds = [...ads]
    .sort((a, b) => b.metrics.views - a.metrics.views)
    .slice(0, 10);
  const topKeywords = [...keywords]
    .sort((a, b) => b.metrics.views - a.metrics.views)
    .slice(0, 10);

  const showEarned = hasEarnedData(total);
  const showQuartiles = hasQuartileData(total);

  const barColors = ["#4285F4", "#1a73e8", "#5b9bff", "#7aaeff", "#a3c6ff"];

  return (
    <div className="space-y-8">
      {/* 핵심 지표 요약 — 시청(TrueView)과 클릭은 다른 단계라 분리해서 본다 */}
      <section>
        <h2 className="mb-1 text-lg font-bold">핵심 지표 요약</h2>
        <p className="mb-3 text-xs text-gray-500">
          ① 직접 시청(TrueView) · ② 클릭 · ③ 파급(획득 조회)은 퍼널의 서로 다른
          단계라 따로 봅니다.
        </p>

        <div className="mb-2 text-xs font-semibold text-gray-500">
          ① 직접 시청 (광고로 본 시청)
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="TrueView 조회수" value={fmtInt(total.views)} sub="광고로 직접 본 시청" />
          <KpiCard label="조회당 비용 (CPV)" value={fmtCpv(total.cpv)} sub="낮을수록 효율적" />
          <KpiCard label="조회율" value={fmtPct(total.viewRate)} sub="조회수 / 노출수" />
          <KpiCard label="총 노출수" value={fmtInt(total.impressions)} />
        </div>

        <div className="mb-2 mt-4 text-xs font-semibold text-gray-500">
          ② 클릭 / 비용
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="총 클릭수" value={fmtInt(total.clicks)} sub="능동적 행동(이동)" />
          <KpiCard label="클릭률 (CTR)" value={fmtPct(total.ctr)} sub="클릭 / 노출" />
          <KpiCard label="총 비용" value={fmtCost(total.cost)} />
          <KpiCard label="CPM" value={fmtCost(total.cpm)} sub="1,000회 노출당" />
        </div>
      </section>

      {/* 구글애즈 vs 프로모션 비교 */}
      {categoryComparison.length > 1 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">유형별 비교 (구글애즈 vs 프로모션)</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">유형</th>
                  <th className="px-4 py-2 text-right font-medium">비용</th>
                  <th className="px-4 py-2 text-right font-medium">조회수</th>
                  <th className="px-4 py-2 text-right font-medium">CPV</th>
                  <th className="px-4 py-2 text-right font-medium">클릭(CTR)</th>
                  <th className="px-4 py-2 text-right font-medium">전환(CPA)</th>
                  <th className="px-4 py-2 text-right font-medium">획득조회율</th>
                </tr>
              </thead>
              <tbody>
                {categoryComparison.map((g) => (
                  <tr key={g.key} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-semibold">{g.key}</td>
                    <td className="px-4 py-2 text-right">{fmtCost(g.metrics.cost)}</td>
                    <td className="px-4 py-2 text-right">{fmtInt(g.metrics.views)}</td>
                    <td className="px-4 py-2 text-right">{fmtCpv(g.metrics.cpv)}</td>
                    <td className="px-4 py-2 text-right">
                      {fmtInt(g.metrics.clicks)}{" "}
                      <span className="text-gray-400">({fmtPct(g.metrics.ctr)})</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {fmtInt(g.metrics.conversions)}{" "}
                      <span className="text-gray-400">
                        ({g.metrics.conversions > 0 ? fmtCost(g.metrics.cpa) : "-"})
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">{fmtPct(g.metrics.followOnRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            두 유형은 목적이 달라요 — 구글애즈는 조회·시청, 프로모션은 클릭·전환 중심
            경향. CPV·CPA로 효율을 비교하세요.
          </p>
        </section>
      )}

      {/* 전환 효율 (CPA·전환율) */}
      {total.conversions > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">전환 효율</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <KpiCard label="전환수" value={fmtInt(total.conversions)} />
            <KpiCard label="전환당 비용 (CPA)" value={fmtCost(total.cpa)} sub="낮을수록 효율적" />
            <KpiCard label="전환율" value={fmtPct(total.convRate)} sub="전환 / 클릭" />
          </div>
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium text-gray-600">
              전환 견인 캠페인 TOP
            </div>
            <ConversionTable
              groups={[...campaigns]
                .filter((c) => c.metrics.conversions > 0)
                .sort((a, b) => b.metrics.conversions - a.metrics.conversions)
                .slice(0, 10)}
            />
          </div>
        </section>
      )}

      {/* ③ 채널 파급·성장 지표 (획득 조회/구독) */}
      {showEarned && (
        <section>
          <h2 className="mb-1 text-lg font-bold">③ 채널 파급·성장 지표</h2>
          <p className="mb-3 text-xs text-gray-500">
            광고 시청이 <b>채널 관심으로 번졌는지</b>를 봅니다. 조회수가 많아도
            여기가 낮으면 “싸게 많이 봤지만 채널엔 관심 안 생김”입니다.
          </p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard
              label="획득 조회수 (follow-on)"
              value={fmtInt(total.earnedViews)}
              sub="광고 이후 추가로 본 조회"
            />
            <KpiCard
              label="획득 조회율"
              value={fmtPct(total.followOnRate)}
              sub="획득 조회수 / TrueView 조회수"
            />
            <KpiCard
              label="획득 구독자"
              value={fmtInt(total.earnedSubscribers)}
              sub="광고 후 자연 구독(earned)"
            />
            <KpiCard
              label="구독 견인율"
              value={fmtPct(total.subRate)}
              sub="획득 구독자 / 조회수"
            />
          </div>

          {/* follow-on율(획득 조회율) 캠페인 비교 — 조회를 채널 관심으로 전환시킨 캠페인 */}
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium text-gray-600">
              획득 조회율(follow-on) 높은 캠페인 — 시청을 채널 관심으로 전환
            </div>
            <FollowOnTable
              groups={[...campaigns]
                .filter((c) => c.metrics.views >= 100)
                .sort((a, b) => b.metrics.followOnRate - a.metrics.followOnRate)
                .slice(0, 10)}
            />
          </div>
        </section>
      )}

      {/* 동영상 재생 진행률 퍼널 */}
      {showQuartiles && (
        <section>
          <h2 className="mb-3 text-lg font-bold">동영상 시청 지속률</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="mb-2 text-sm text-gray-500">
              노출 가중 평균. 막대가 뒤로 갈수록 천천히 줄어들수록 끝까지 보는
              영상입니다.
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={[
                  { stage: "25% 재생", rate: Number((total.vp25 * 100).toFixed(1)) },
                  { stage: "50% 재생", rate: Number((total.vp50 * 100).toFixed(1)) },
                  { stage: "75% 재생", rate: Number((total.vp75 * 100).toFixed(1)) },
                  { stage: "100% 완시청", rate: Number((total.vp100 * 100).toFixed(1)) },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                  {["#4285F4", "#1a73e8", "#fbbc04", "#ea4335"].map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 자동 인사이트 */}
      {insights.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">자동 인사이트</h2>
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div
                key={i}
                className={`rounded-lg border-l-4 bg-white p-3 ${
                  ins.type === "positive"
                    ? "border-green-500"
                    : ins.type === "warning"
                    ? "border-amber-500"
                    : "border-blue-400"
                }`}
              >
                <div className="font-semibold">{ins.title}</div>
                <div className="text-sm text-gray-600">{ins.detail}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 조회수 견인 광고(소재) 차트 */}
      {topAds.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">조회수 견인 광고(소재) TOP</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <ResponsiveContainer width="100%" height={340}>
              <BarChart
                layout="vertical"
                data={topAds.map((c) => ({ full: c.key, views: c.metrics.views }))}
                margin={{ left: 12, right: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtInt(v)} />
                <YAxis
                  type="category"
                  dataKey="full"
                  tick={{ fontSize: 11 }}
                  width={150}
                  tickFormatter={(v: string) => shortLabel(v)}
                />
                <Tooltip
                  formatter={(v: number) => [fmtInt(v) + "회", "조회수"]}
                  labelFormatter={(label: string) => label}
                  contentStyle={{ maxWidth: 320, whiteSpace: "normal" }}
                />
                <Bar dataKey="views" radius={[0, 6, 6, 0]} fill="#4285F4" />
              </BarChart>
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-gray-400">
              세로축은 광고명만 표시 · 막대에 마우스를 올리면 전체 경로(캠페인 ›
              광고그룹 › 광고명)가 보입니다.
            </p>
          </div>
          <div className="mt-3">
            <RankTable groups={topAds} dimensionLabel="광고(소재)" showSubs={showEarned} />
          </div>
        </section>
      )}

      {/* 조회수 견인 캠페인 차트 */}
      <section>
        <h2 className="mb-3 text-lg font-bold">조회수 견인 캠페인 TOP</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topCampaigns.map((c) => ({ name: c.key, views: c.metrics.views }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtInt(v)} />
              <Tooltip formatter={(v: number) => fmtInt(v) + "회"} />
              <Bar dataKey="views" radius={[6, 6, 0, 0]}>
                {topCampaigns.map((_, i) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 기간별 추이 */}
      {trend.length > 1 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">기간별 추이</h2>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtInt(v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="views" name="조회수" stroke="#4285F4" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="cpv" name="CPV(₩)" stroke="#ea4335" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* 캠페인 순위 테이블 */}
      <section>
        <h2 className="mb-3 text-lg font-bold">캠페인 순위</h2>
        <RankTable groups={topCampaigns} dimensionLabel="캠페인" showSubs={showEarned} />
      </section>

      {/* 키워드 순위 테이블 */}
      {topKeywords.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">조회수 기여 키워드 순위</h2>
          <RankTable groups={topKeywords} dimensionLabel="키워드" showSubs={showEarned} />
        </section>
      )}

      {/* 광고그룹(타겟팅)별 분석 */}
      {adGroups.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">광고그룹(타겟팅)별 분석</h2>
          <RankTable
            groups={[...adGroups]
              .sort((a, b) => b.metrics.views - a.metrics.views)
              .slice(0, 12)}
            dimensionLabel="광고그룹"
            showSubs={showEarned}
          />
          <p className="mt-2 text-xs text-gray-400">
            어떤 타겟팅(광고그룹)이 조회·전환 효율이 좋은지 비교해 예산 배분에
            활용하세요.
          </p>
        </section>
      )}

      {/* 기기별 분해 */}
      {devices.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">기기별 분석</h2>
          <RankTable
            groups={[...devices].sort((a, b) => b.metrics.views - a.metrics.views)}
            dimensionLabel="기기"
            showSubs={showEarned}
          />
        </section>
      )}

      {/* 인구통계 분해 */}
      {(ages.length > 0 || genders.length > 0) && (
        <section>
          <h2 className="mb-3 text-lg font-bold">인구통계 분석</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {ages.length > 0 && (
              <div>
                <div className="mb-1 text-sm font-medium text-gray-600">연령대</div>
                <RankTable
                  groups={[...ages].sort((a, b) => b.metrics.views - a.metrics.views)}
                  dimensionLabel="연령"
                  showSubs={false}
                />
              </div>
            )}
            {genders.length > 0 && (
              <div>
                <div className="mb-1 text-sm font-medium text-gray-600">성별</div>
                <RankTable
                  groups={[...genders].sort((a, b) => b.metrics.views - a.metrics.views)}
                  dimensionLabel="성별"
                  showSubs={false}
                />
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ConversionTable({ groups }: { groups: GroupResult[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
        전환이 발생한 캠페인이 없습니다.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">캠페인</th>
            <th className="px-4 py-2 text-right font-medium">전환수</th>
            <th className="px-4 py-2 text-right font-medium">전환율</th>
            <th className="px-4 py-2 text-right font-medium">CPA</th>
            <th className="px-4 py-2 text-right font-medium">비용</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => (
            <tr key={g.key} className="border-t border-gray-100">
              <td className="px-4 py-2 text-gray-400">{i + 1}</td>
              <td className="px-4 py-2 font-medium">{g.key}</td>
              <td className="px-4 py-2 text-right">{fmtInt(g.metrics.conversions)}</td>
              <td className="px-4 py-2 text-right">{fmtPct(g.metrics.convRate)}</td>
              <td className="px-4 py-2 text-right">{fmtCost(g.metrics.cpa)}</td>
              <td className="px-4 py-2 text-right">{fmtCost(g.metrics.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FollowOnTable({ groups }: { groups: GroupResult[] }) {
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500">
        비교할 캠페인이 없습니다 (조회수 100회 이상 기준).
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">캠페인</th>
            <th className="px-4 py-2 text-right font-medium">TrueView 조회수</th>
            <th className="px-4 py-2 text-right font-medium">획득 조회수</th>
            <th className="px-4 py-2 text-right font-medium">획득 조회율</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => (
            <tr key={g.key} className="border-t border-gray-100">
              <td className="px-4 py-2 text-gray-400">{i + 1}</td>
              <td className="px-4 py-2 font-medium">{g.key}</td>
              <td className="px-4 py-2 text-right">{fmtInt(g.metrics.views)}</td>
              <td className="px-4 py-2 text-right">{fmtInt(g.metrics.earnedViews)}</td>
              <td className="px-4 py-2 text-right font-semibold text-green-700">
                {fmtPct(g.metrics.followOnRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RankTable({
  groups,
  dimensionLabel,
  showSubs,
}: {
  groups: GroupResult[];
  dimensionLabel: string;
  showSubs: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-500">
          <tr>
            <th className="px-4 py-2 font-medium">#</th>
            <th className="px-4 py-2 font-medium">{dimensionLabel}</th>
            <th className="px-4 py-2 text-right font-medium">조회수</th>
            <th className="px-4 py-2 text-right font-medium">조회율</th>
            <th className="px-4 py-2 text-right font-medium">CPV</th>
            {showSubs && (
              <th className="px-4 py-2 text-right font-medium">획득 구독자</th>
            )}
            <th className="px-4 py-2 text-right font-medium">비용</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => (
            <tr key={g.key} className="border-t border-gray-100">
              <td className="px-4 py-2 text-gray-400">{i + 1}</td>
              <td className="px-4 py-2 font-medium">{g.key}</td>
              <td className="px-4 py-2 text-right">{fmtInt(g.metrics.views)}</td>
              <td className="px-4 py-2 text-right">{fmtPct(g.metrics.viewRate)}</td>
              <td className="px-4 py-2 text-right">{fmtCpv(g.metrics.cpv)}</td>
              {showSubs && (
                <td className="px-4 py-2 text-right">
                  {fmtInt(g.metrics.earnedSubscribers)}
                </td>
              )}
              <td className="px-4 py-2 text-right">{fmtCost(g.metrics.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
