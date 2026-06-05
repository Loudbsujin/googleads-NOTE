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
import { GroupResult, Metrics, NormalizedRow, groupBy } from "@/lib/metrics";
import { Insight } from "@/lib/insights";

interface Props {
  total: Metrics;
  campaigns: GroupResult[];
  keywords: GroupResult[];
  rows: NormalizedRow[];
  insights: Insight[];
}

const fmtInt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const fmtCpv = (n: number) => `₩${n.toFixed(1)}`;
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;
const fmtCost = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;

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

export default function Report({ total, campaigns, keywords, rows, insights }: Props) {
  const trend = buildTrend(rows);
  const topCampaigns = [...campaigns]
    .sort((a, b) => b.metrics.views - a.metrics.views)
    .slice(0, 8);
  const topKeywords = [...keywords]
    .sort((a, b) => b.metrics.views - a.metrics.views)
    .slice(0, 10);

  const barColors = ["#4285F4", "#1a73e8", "#5b9bff", "#7aaeff", "#a3c6ff"];

  return (
    <div className="space-y-8">
      {/* 핵심 지표 요약 */}
      <section>
        <h2 className="mb-3 text-lg font-bold">핵심 지표 요약</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="총 조회수" value={fmtInt(total.views)} sub="견인된 시청" />
          <KpiCard label="조회당 비용 (CPV)" value={fmtCpv(total.cpv)} sub="낮을수록 효율적" />
          <KpiCard label="조회율" value={fmtPct(total.viewRate)} sub="조회수 / 노출수" />
          <KpiCard label="총 비용" value={fmtCost(total.cost)} />
          <KpiCard label="총 노출수" value={fmtInt(total.impressions)} />
          <KpiCard label="총 클릭수" value={fmtInt(total.clicks)} sub={`CTR ${fmtPct(total.ctr)}`} />
          <KpiCard label="CPM" value={fmtCost(total.cpm)} sub="1,000회 노출당" />
          <KpiCard label="전환수" value={fmtInt(total.conversions)} />
        </div>
      </section>

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
        <RankTable groups={topCampaigns} dimensionLabel="캠페인" />
      </section>

      {/* 키워드 순위 테이블 */}
      {topKeywords.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">조회수 기여 키워드 순위</h2>
          <RankTable groups={topKeywords} dimensionLabel="키워드" />
        </section>
      )}
    </div>
  );
}

function RankTable({
  groups,
  dimensionLabel,
}: {
  groups: GroupResult[];
  dimensionLabel: string;
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
              <td className="px-4 py-2 text-right">{fmtCost(g.metrics.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
