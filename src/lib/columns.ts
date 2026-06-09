// Google Ads Excel/CSV 헤더 자동 매핑.
// 한국어/영어 헤더를 모두 인식하여 표준 필드로 정규화한다.

export type CanonicalField =
  | "campaign"
  | "campaignId"
  | "campaignType"
  | "adName"
  | "adGroup"
  | "keyword"
  | "date"
  | "device"
  | "age"
  | "gender"
  | "currency"
  | "impressions"
  | "views"
  | "clicks"
  | "cost"
  | "conversions"
  | "earnedViews"
  | "earnedSubscribers"
  | "vp25"
  | "vp50"
  | "vp75"
  | "vp100";

// 각 표준 필드에 매칭되는 헤더 후보(정규화 후 비교).
const FIELD_ALIASES: Record<CanonicalField, string[]> = {
  campaign: ["campaign", "캠페인", "캠페인이름", "campaignname"],
  // 캠페인 ID(숫자)/유형("동영상" 등)을 캠페인 이름으로 오인식하지 않도록 먼저 흡수하는 decoy 필드
  campaignId: ["캠페인id", "campaignid"],
  campaignType: ["캠페인유형", "campaigntype"],
  // 동영상/광고 보고서에는 캠페인명 대신 광고 이름이 핵심 견인 차원이 된다
  adName: ["광고이름", "adname", "광고소재"],
  adGroup: ["adgroup", "광고그룹", "광고그룹이름", "adgroupname"],
  keyword: ["keyword", "키워드", "searchkeyword", "검색어"],
  date: ["day", "date", "날짜", "일", "week", "month", "주", "월"],
  device: ["device", "기기", "디바이스"],
  age: ["age", "연령", "연령대"],
  gender: ["gender", "성별"],
  currency: ["통화코드", "currencycode", "currency", "통화"],
  impressions: ["impressions", "impr", "노출수", "노출"],
  views: ["views", "조회수", "동영상조회수", "videoviews"],
  clicks: ["clicks", "클릭수", "클릭"],
  cost: ["cost", "비용", "spend", "지출", "총비용"],
  conversions: ["conversions", "conv", "전환수", "전환"],
  earnedViews: ["earnedviews", "획득조회수", "earnview"],
  earnedSubscribers: [
    "earnedsubscribers",
    "획득구독자",
    "구독수",
    "구독자",
    "subscribers",
  ],
  vp25: ["videoplayedto25", "playedto25", "진행률25", "25재생", "played25"],
  vp50: ["videoplayedto50", "playedto50", "진행률50", "50재생", "played50"],
  vp75: ["videoplayedto75", "playedto75", "진행률75", "75재생", "played75"],
  vp100: ["videoplayedto100", "playedto100", "진행률100", "100재생", "played100"],
};

function normalize(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\s_().%₩$/\-:：,]/g, "")
    .replace(/avg\.?/g, "avg")
    .trim();
}

// 실제 헤더 배열 -> { 표준필드: 원본헤더 } 매핑 반환.
// 1차: 정확히 일치하는 헤더 우선 배정 (예: "획득조회수"가 "조회수"에 잘못 잡히지 않게)
// 2차: 미배정 필드에 한해 부분 일치(includes)로 배정. 이미 쓰인 헤더는 제외.
export function mapHeaders(
  headers: string[]
): Partial<Record<CanonicalField, string>> {
  const result: Partial<Record<CanonicalField, string>> = {};
  const claimed = new Set<string>();
  const normalizedHeaders = headers.map((h) => ({ raw: h, norm: normalize(h) }));
  const fields = Object.keys(FIELD_ALIASES) as CanonicalField[];

  // 1차: 정확 일치
  fields.forEach((field) => {
    const aliases = FIELD_ALIASES[field].map(normalize);
    const match = normalizedHeaders.find(
      (h) => !claimed.has(h.raw) && aliases.some((a) => h.norm === a)
    );
    if (match) {
      result[field] = match.raw;
      claimed.add(match.raw);
    }
  });

  // 2차: 부분 일치
  fields.forEach((field) => {
    if (result[field]) return;
    const aliases = FIELD_ALIASES[field].map(normalize);
    const match = normalizedHeaders.find(
      (h) => !claimed.has(h.raw) && aliases.some((a) => h.norm.includes(a))
    );
    if (match) {
      result[field] = match.raw;
      claimed.add(match.raw);
    }
  });

  return result;
}
