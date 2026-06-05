// 표준화된 행 데이터에서 파생 지표를 계산한다.
// 유튜브 조회수 견인 캠페인에 초점: CPV(조회당 비용), 조회율 중심.

import { CanonicalField, mapHeaders } from "./columns";

export interface RawRow {
  [key: string]: string | number | undefined;
}

export interface NormalizedRow {
  campaign: string;
  adGroup: string;
  keyword: string;
  date: string;
  impressions: number;
  views: number;
  clicks: number;
  cost: number;
  conversions: number;
}

export interface Metrics {
  impressions: number;
  views: number;
  clicks: number;
  cost: number;
  conversions: number;
  // 파생 지표
  viewRate: number; // 조회율 = 조회수 / 노출수
  cpv: number; // 조회당 비용 = 비용 / 조회수
  ctr: number; // 클릭률 = 클릭수 / 노출수
  cpc: number; // 클릭당 비용 = 비용 / 클릭수
  cpm: number; // 1000회 노출당 비용
}

// 숫자 파싱: "1,234", "₩1,234", "12.3%" 등 처리.
function toNumber(value: string | number | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const cleaned = value.replace(/[,₩$%\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function safeDiv(a: number, b: number): number {
  return b > 0 ? a / b : 0;
}

export function computeMetrics(rows: NormalizedRow[]): Metrics {
  const sum = rows.reduce(
    (acc, r) => ({
      impressions: acc.impressions + r.impressions,
      views: acc.views + r.views,
      clicks: acc.clicks + r.clicks,
      cost: acc.cost + r.cost,
      conversions: acc.conversions + r.conversions,
    }),
    { impressions: 0, views: 0, clicks: 0, cost: 0, conversions: 0 }
  );

  return {
    ...sum,
    viewRate: safeDiv(sum.views, sum.impressions),
    cpv: safeDiv(sum.cost, sum.views),
    ctr: safeDiv(sum.clicks, sum.impressions),
    cpc: safeDiv(sum.cost, sum.clicks),
    cpm: safeDiv(sum.cost, sum.impressions) * 1000,
  };
}

// 원본 행 배열을 표준 행으로 정규화.
// fallbackCampaign: 캠페인 컬럼이 없는 파일(캠페인별로 분리된 export 등)에서
// 캠페인 이름 대신 사용할 값 (예: 파일명).
export function normalizeRows(
  rawRows: RawRow[],
  fallbackCampaign?: string
): {
  rows: NormalizedRow[];
  mapping: Partial<Record<CanonicalField, string>>;
} {
  if (rawRows.length === 0) return { rows: [], mapping: {} };

  const headers = Object.keys(rawRows[0]);
  const mapping = mapHeaders(headers);

  const get = (row: RawRow, field: CanonicalField): string | number | undefined => {
    const col = mapping[field];
    return col ? row[col] : undefined;
  };

  const campaignOf = (row: RawRow): string => {
    const raw = get(row, "campaign");
    const value = raw == null ? "" : String(raw).trim();
    return value || fallbackCampaign || "(미지정)";
  };

  const rows: NormalizedRow[] = rawRows
    .map((row) => ({
      campaign: campaignOf(row),
      adGroup: String(get(row, "adGroup") ?? ""),
      keyword: String(get(row, "keyword") ?? ""),
      date: String(get(row, "date") ?? ""),
      impressions: toNumber(get(row, "impressions")),
      views: toNumber(get(row, "views")),
      clicks: toNumber(get(row, "clicks")),
      cost: toNumber(get(row, "cost")),
      conversions: toNumber(get(row, "conversions")),
    }))
    // 합계/총계 행 및 완전히 빈 행 제거
    .filter((r) => {
      const isTotal = /total|총계|합계/i.test(r.campaign);
      const isEmpty =
        r.impressions === 0 && r.views === 0 && r.clicks === 0 && r.cost === 0;
      return !isTotal && !isEmpty;
    });

  return { rows, mapping };
}

// 특정 차원(캠페인/키워드 등)별로 그룹핑 후 지표 계산.
export interface GroupResult {
  key: string;
  metrics: Metrics;
}

export function groupBy(
  rows: NormalizedRow[],
  dimension: keyof NormalizedRow
): GroupResult[] {
  const groups = new Map<string, NormalizedRow[]>();
  rows.forEach((r) => {
    const key = String(r[dimension]) || "(미지정)";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  });

  return Array.from(groups.entries())
    .map(([key, groupRows]) => ({ key, metrics: computeMetrics(groupRows) }))
    .filter((g) => g.key && g.key !== "(미지정)");
}
