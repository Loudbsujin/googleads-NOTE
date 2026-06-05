// 통화 환율 조회: USD·JPY 등을 원화(KRW)로 환산할 평균 환율을 자동으로 가져온다.
// 1순위: Frankfurter(ECB) 최근 약 6개월 시계열의 평균 (= "평균 환율")
// 2순위: Frankfurter 최신 환율
// 3순위: 내장 기본값 (네트워크 실패 시)
// 모든 값은 "해당 통화 1단위 = N원" 형식.

export interface RateResult {
  rates: Record<string, number>; // { JPY: 9.1, USD: 1350, ... }
  source: string; // 사용자에게 보여줄 출처/설명
}

// 네트워크 실패 시 사용할 대략적인 기본 환율 (참고용, 사용자가 수정 가능)
const FALLBACK: Record<string, number> = {
  USD: 1350,
  JPY: 9.0,
  EUR: 1450,
  CNY: 188,
  GBP: 1700,
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// 단일 통화의 최근 약 6개월 평균 환율(→KRW)을 시계열로 계산.
async function fetchAverage(currency: string): Promise<number | null> {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  const url = `https://api.frankfurter.app/${ymd(start)}..${ymd(
    end
  )}?from=${currency}&to=KRW`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const values: number[] = Object.values(data.rates ?? {})
      .map((r) => (r as Record<string, number>)["KRW"])
      .filter((v) => typeof v === "number");
    const avg = average(values);
    return avg > 0 ? avg : null;
  } catch {
    return null;
  }
}

// 최신 환율(→KRW) 폴백.
async function fetchLatest(currency: string): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${currency}&to=KRW`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const v = data.rates?.KRW;
    return typeof v === "number" && v > 0 ? v : null;
  } catch {
    return null;
  }
}

// 필요한 통화들의 환율을 한 번에 조회.
export async function fetchRatesToKRW(
  currencies: string[]
): Promise<RateResult> {
  const rates: Record<string, number> = {};
  let usedAverage = false;
  let usedFallback = false;

  await Promise.all(
    currencies.map(async (cur) => {
      const avg = await fetchAverage(cur);
      if (avg != null) {
        rates[cur] = Math.round(avg * 100) / 100;
        usedAverage = true;
        return;
      }
      const latest = await fetchLatest(cur);
      if (latest != null) {
        rates[cur] = Math.round(latest * 100) / 100;
        return;
      }
      rates[cur] = FALLBACK[cur] ?? 1;
      usedFallback = true;
    })
  );

  const source = usedFallback
    ? "기본값(환율 조회 실패 — 직접 수정 권장)"
    : usedAverage
    ? "최근 6개월 평균 환율 (ECB / frankfurter.app)"
    : "최신 환율 (ECB / frankfurter.app)";

  return { rates, source };
}
