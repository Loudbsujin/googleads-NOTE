// 표준화된 행 데이터에서 파생 지표를 계산한다.
// 유튜브 조회수 견인 + 채널 성장에 초점:
// CPV·조회율, 획득 조회수/구독자, 동영상 재생 진행률(시청 지속률).

import { CanonicalField, mapHeaders } from "./columns";

export interface RawRow {
  [key: string]: string | number | undefined;
}

export interface NormalizedRow {
  // 차원
  campaign: string;
  category: string; // 캠페인 유형 분류: "동영상" | "디멘드젠"
  adName: string;
  adGroup: string;
  keyword: string;
  date: string;
  device: string;
  age: string;
  gender: string;
  currency: string;
  // 지표 (합산 가능)
  impressions: number;
  views: number;
  clicks: number;
  cost: number;
  conversions: number;
  earnedViews: number;
  earnedSubscribers: number;
  // 동영상 재생 진행률 (0~1 비율, 행별 값)
  vp25: number;
  vp50: number;
  vp75: number;
  vp100: number;
}

export interface Metrics {
  impressions: number;
  views: number;
  clicks: number;
  cost: number;
  conversions: number;
  earnedViews: number;
  earnedSubscribers: number;
  // 파생 지표
  viewRate: number; // 조회율 = 조회수 / 노출수
  cpv: number; // 조회당 비용 = 비용 / 조회수
  ctr: number; // 클릭률 = 클릭수 / 노출수
  cpc: number; // 클릭당 비용 = 비용 / 클릭수
  cpm: number; // 1000회 노출당 비용
  followOnRate: number; // 획득 조회율(follow-on) = 획득 조회수 / TrueView 조회수
  subRate: number; // 구독 견인율 = 획득 구독자 / 조회수
  // 재생 진행률 (노출 가중 평균, 0~1)
  vp25: number;
  vp50: number;
  vp75: number;
  vp100: number;
}

// 숫자 파싱: "1,234", "₩1,234", "12.3%" 등 처리.
function toNumber(value: string | number | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  const cleaned = value.replace(/[,₩$%\s]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// 비율 파싱: "75.3%" -> 0.753, "0.75" -> 0.75. 0~1로 정규화.
function toRate(value: string | number | undefined): number {
  const n = toNumber(value);
  if (n <= 0) return 0;
  const rate = n > 1 ? n / 100 : n;
  return rate > 1 ? 1 : rate;
}

function safeDiv(a: number, b: number): number {
  return b > 0 ? a / b : 0;
}

export function computeMetrics(rows: NormalizedRow[]): Metrics {
  let impressions = 0,
    views = 0,
    clicks = 0,
    cost = 0,
    conversions = 0,
    earnedViews = 0,
    earnedSubscribers = 0;
  // 재생 진행률은 노출수로 가중 평균
  let w = 0,
    vp25w = 0,
    vp50w = 0,
    vp75w = 0,
    vp100w = 0;

  for (const r of rows) {
    impressions += r.impressions;
    views += r.views;
    clicks += r.clicks;
    cost += r.cost;
    conversions += r.conversions;
    earnedViews += r.earnedViews;
    earnedSubscribers += r.earnedSubscribers;

    if (r.vp25 || r.vp50 || r.vp75 || r.vp100) {
      const wt = r.impressions > 0 ? r.impressions : 1;
      w += wt;
      vp25w += r.vp25 * wt;
      vp50w += r.vp50 * wt;
      vp75w += r.vp75 * wt;
      vp100w += r.vp100 * wt;
    }
  }

  return {
    impressions,
    views,
    clicks,
    cost,
    conversions,
    earnedViews,
    earnedSubscribers,
    viewRate: safeDiv(views, impressions),
    cpv: safeDiv(cost, views),
    ctr: safeDiv(clicks, impressions),
    cpc: safeDiv(cost, clicks),
    cpm: safeDiv(cost, impressions) * 1000,
    followOnRate: safeDiv(earnedViews, views),
    subRate: safeDiv(earnedSubscribers, views),
    vp25: safeDiv(vp25w, w),
    vp50: safeDiv(vp50w, w),
    vp75: safeDiv(vp75w, w),
    vp100: safeDiv(vp100w, w),
  };
}

// 데이터에 특정 지표 그룹이 존재하는지 (섹션 표시 여부 판단).
export function hasEarnedData(m: Metrics): boolean {
  return m.earnedViews > 0 || m.earnedSubscribers > 0;
}
export function hasQuartileData(m: Metrics): boolean {
  return m.vp25 > 0 || m.vp50 > 0 || m.vp75 > 0 || m.vp100 > 0;
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

  // Google Ads는 빈 값을 "--"(또는 "—")로 표기하므로 빈 문자열로 정규화한다.
  const clean = (raw: string | number | undefined): string => {
    const v = raw == null ? "" : String(raw).trim();
    return v === "--" || v === "—" ? "" : v;
  };

  const campaignOf = (row: RawRow): string =>
    clean(get(row, "campaign")) || fallbackCampaign || "(미지정)";

  const str = (row: RawRow, field: CanonicalField): string =>
    clean(get(row, field));

  // 광고 유형으로 캠페인 분류 ("디맨드젠 동영상 광고" → 디멘드젠, 그 외 → 동영상)
  const categoryOf = (row: RawRow): string => {
    const adType = str(row, "adType");
    if (/디맨드젠|디멘드젠|demand\s*gen/i.test(adType)) return "디멘드젠";
    return "동영상";
  };

  const rows: NormalizedRow[] = rawRows
    .map((row) => ({
      campaign: campaignOf(row),
      category: categoryOf(row),
      adName: str(row, "adName"),
      adGroup: str(row, "adGroup"),
      keyword: str(row, "keyword"),
      date: str(row, "date"),
      device: str(row, "device"),
      age: str(row, "age"),
      gender: str(row, "gender"),
      currency: (clean(get(row, "currency")) || "KRW").toUpperCase(),
      impressions: toNumber(get(row, "impressions")),
      views: toNumber(get(row, "views")),
      clicks: toNumber(get(row, "clicks")),
      cost: toNumber(get(row, "cost")),
      conversions: toNumber(get(row, "conversions")),
      earnedViews: toNumber(get(row, "earnedViews")),
      earnedSubscribers: toNumber(get(row, "earnedSubscribers")),
      vp25: toRate(get(row, "vp25")),
      vp50: toRate(get(row, "vp50")),
      vp75: toRate(get(row, "vp75")),
      vp100: toRate(get(row, "vp100")),
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

// 데이터에 등장하는 캠페인 유형 분류 목록 (행 수 많은 순).
export function detectCategories(rows: NormalizedRow[]): string[] {
  const counts = new Map<string, number>();
  rows.forEach((r) => counts.set(r.category, (counts.get(r.category) ?? 0) + 1));
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);
}

// 데이터에 등장하는 통화 코드 목록 (KRW 제외, 환산이 필요한 것만).
export function detectForeignCurrencies(rows: NormalizedRow[]): string[] {
  const set = new Set<string>();
  rows.forEach((r) => {
    const c = (r.currency || "KRW").toUpperCase();
    if (c && c !== "KRW") set.add(c);
  });
  return Array.from(set);
}

// 각 행의 비용을 통화별 환율(통화 1단위당 KRW)로 곱해 원화로 환산한 새 행 배열 반환.
// rateToKRW 예: { JPY: 9.1, USD: 1350 } (KRW는 항상 1)
export function convertToKRW(
  rows: NormalizedRow[],
  rateToKRW: Record<string, number>
): NormalizedRow[] {
  return rows.map((r) => {
    const cur = (r.currency || "KRW").toUpperCase();
    const rate = cur === "KRW" ? 1 : rateToKRW[cur] ?? 1;
    return rate === 1 ? r : { ...r, cost: r.cost * rate };
  });
}

// 특정 차원(캠페인/키워드/기기 등)별로 그룹핑 후 지표 계산.
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
