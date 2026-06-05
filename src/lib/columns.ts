// Google Ads Excel/CSV 헤더 자동 매핑.
// 한국어/영어 헤더를 모두 인식하여 표준 필드로 정규화한다.

export type CanonicalField =
  | "campaign"
  | "adGroup"
  | "keyword"
  | "date"
  | "impressions"
  | "views"
  | "clicks"
  | "cost"
  | "conversions"
  | "avgWatchTime"
  | "viewRate";

// 각 표준 필드에 매칭되는 헤더 후보(소문자, 공백/특수문자 제거 후 비교).
const FIELD_ALIASES: Record<CanonicalField, string[]> = {
  campaign: ["campaign", "캠페인", "캠페인이름", "campaignname"],
  adGroup: ["adgroup", "광고그룹", "광고그룹이름", "adgroupname"],
  keyword: ["keyword", "키워드", "searchkeyword", "검색어"],
  date: ["day", "date", "날짜", "일", "week", "month", "주", "월"],
  impressions: ["impressions", "impr", "노출수", "노출"],
  views: ["views", "조회수", "동영상조회수", "videoviews"],
  clicks: ["clicks", "클릭수", "클릭"],
  cost: ["cost", "비용", "spend", "지출", "총비용"],
  conversions: ["conversions", "conv", "전환수", "전환"],
  avgWatchTime: [
    "avgwatchtime",
    "평균시청시간",
    "averagewatchtime",
    "watchtime",
  ],
  viewRate: ["viewrate", "조회율", "videoviewrate", "vr"],
};

function normalize(header: string): string {
  return header
    .toLowerCase()
    .replace(/[\s_().%₩$/\-]/g, "")
    .replace(/avg\.?/g, "avg")
    .trim();
}

// 실제 헤더 배열 -> { 표준필드: 원본헤더 } 매핑 반환.
export function mapHeaders(
  headers: string[]
): Partial<Record<CanonicalField, string>> {
  const result: Partial<Record<CanonicalField, string>> = {};
  const normalizedHeaders = headers.map((h) => ({
    raw: h,
    norm: normalize(h),
  }));

  (Object.keys(FIELD_ALIASES) as CanonicalField[]).forEach((field) => {
    const aliases = FIELD_ALIASES[field].map(normalize);
    const match = normalizedHeaders.find((h) =>
      aliases.some((a) => h.norm === a || h.norm.includes(a))
    );
    if (match) result[field] = match.raw;
  });

  return result;
}
