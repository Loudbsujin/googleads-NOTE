"use client";

interface Props {
  currencies: string[]; // 환산이 필요한 통화 (예: ["JPY"])
  rates: Record<string, number>; // 통화 1단위당 원화
  source: string; // 환율 출처 설명
  onChange: (next: Record<string, number>) => void;
}

const NAMES: Record<string, string> = {
  USD: "미국 달러",
  JPY: "일본 엔",
  EUR: "유로",
  CNY: "중국 위안",
  GBP: "영국 파운드",
};

export default function CurrencyBar({ currencies, rates, source, onChange }: Props) {
  const loading = currencies.some((c) => rates[c] == null);

  return (
    <div className="no-print rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
        💱 환율 적용 (원화 환산)
      </div>

      {loading ? (
        <p className="text-sm text-amber-700">평균 환율을 불러오는 중…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4">
            {currencies.map((cur) => (
              <label key={cur} className="flex items-center gap-2 text-sm">
                <span className="font-medium">
                  1 {cur}
                  {NAMES[cur] ? ` (${NAMES[cur]})` : ""} =
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={rates[cur] ?? 0}
                  onChange={(e) =>
                    onChange({ ...rates, [cur]: parseFloat(e.target.value) || 0 })
                  }
                  className="w-28 rounded-md border border-amber-300 bg-white px-2 py-1 text-right"
                />
                <span className="text-gray-600">원</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-amber-700">
            출처: {source}. 모든 비용·CPV·CPM은 위 환율로 원화 환산해 표시됩니다.
            정확한 기간 평균 환율을 알고 있다면 값을 직접 수정하세요.
          </p>
        </>
      )}
    </div>
  );
}
