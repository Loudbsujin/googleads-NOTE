"use client";

import { useMemo, useState } from "react";
import FileUpload from "@/components/FileUpload";
import Report from "@/components/Report";
import ExportBar from "@/components/ExportBar";
import CurrencyBar from "@/components/CurrencyBar";
import { parseFile } from "@/lib/parse";
import {
  GroupResult,
  Metrics,
  NormalizedRow,
  computeMetrics,
  convertToKRW,
  detectForeignCurrencies,
  groupBy,
  normalizeRows,
} from "@/lib/metrics";
import { Insight, buildInsights } from "@/lib/insights";
import { fetchRatesToKRW } from "@/lib/currency";

interface Analysis {
  total: Metrics;
  campaigns: GroupResult[];
  ads: GroupResult[];
  keywords: GroupResult[];
  devices: GroupResult[];
  ages: GroupResult[];
  genders: GroupResult[];
  rows: NormalizedRow[];
  insights: Insight[];
  fileName: string;
}

// 파일명에서 확장자를 떼어 캠페인 이름 대체값으로 쓴다.
function campaignNameFromFile(name: string): string {
  return name.replace(/\.[^.]+$/, "").trim() || name;
}

// 원화 환산된 행으로 보고서용 분석 결과를 만든다.
function analyze(rows: NormalizedRow[], fileNames: string[]): Analysis {
  const total = computeMetrics(rows);
  const campaigns = groupBy(rows, "campaign");
  const ads = groupBy(rows, "adName");
  const keywords = groupBy(rows, "keyword");
  return {
    total,
    campaigns,
    ads,
    keywords,
    devices: groupBy(rows, "device"),
    ages: groupBy(rows, "age"),
    genders: groupBy(rows, "gender"),
    rows,
    insights: buildInsights(total, campaigns, keywords, ads),
    fileName:
      fileNames.length === 1 ? fileNames[0] : `${fileNames.length}개 파일 합산`,
  };
}

export default function Home() {
  const [baseRows, setBaseRows] = useState<NormalizedRow[] | null>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [rateSource, setRateSource] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 환산된 행 → 분석 결과 (환율이 바뀌면 자동 재계산)
  const analysis = useMemo(() => {
    if (!baseRows) return null;
    const converted = convertToKRW(baseRows, rates);
    return analyze(converted, fileNames);
  }, [baseRows, rates, fileNames]);

  async function handleFiles(files: File[]) {
    setLoading(true);
    setError(null);
    try {
      const allRows: NormalizedRow[] = [];
      const failed: string[] = [];

      for (const file of files) {
        try {
          const rawRows = await parseFile(file);
          const { rows } = normalizeRows(rawRows, campaignNameFromFile(file.name));
          if (rows.length === 0) failed.push(file.name);
          allRows.push(...rows);
        } catch {
          failed.push(file.name);
        }
      }

      if (allRows.length === 0) {
        throw new Error(
          "분석할 데이터를 찾지 못했습니다. Google Ads에서 내보낸 Excel/CSV가 맞는지 확인해 주세요."
        );
      }

      const okNames = files.map((f) => f.name).filter((n) => !failed.includes(n));
      const foreign = detectForeignCurrencies(allRows);

      setBaseRows(allRows);
      setFileNames(okNames);
      setCurrencies(foreign);
      setError(
        failed.length > 0
          ? `다음 파일은 데이터를 읽지 못해 제외했습니다: ${failed.join(", ")}`
          : null
      );

      // 외화가 있으면 평균 환율을 자동 조회해 적용
      if (foreign.length > 0) {
        const { rates: fetched, source } = await fetchRatesToKRW(foreign);
        setRates(fetched);
        setRateSource(source);
      } else {
        setRates({});
        setRateSource("");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일 분석 중 오류가 발생했습니다.");
      setBaseRows(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Google Ads 조회수 분석 리포트</h1>
        <p className="mt-1 text-gray-500">
          구글 애즈 Excel 데이터를 업로드하면 조회수 견인 요소를 자동 분석해
          보고서로 보여드립니다. 외화(USD·JPY 등)는 자동으로 원화로 환산됩니다.
        </p>
      </header>

      <div className="no-print">
        <FileUpload onFiles={handleFiles} loading={loading} />
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {analysis && (
        <div className="mt-10">
          <div className="no-print mb-6 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              분석 파일 ({fileNames.length}개):{" "}
              <span className="font-medium">{fileNames.join(", ")}</span>
            </div>
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              PDF로 저장 / 인쇄
            </button>
          </div>

          {currencies.length > 0 && (
            <div className="mb-6">
              <CurrencyBar
                currencies={currencies}
                rates={rates}
                source={rateSource}
                onChange={(next) => setRates(next)}
              />
            </div>
          )}

          <div className="mb-6">
            <ExportBar
              input={{
                fileName: analysis.fileName,
                total: analysis.total,
                campaigns: analysis.campaigns,
                ads: analysis.ads,
                keywords: analysis.keywords,
                insights: analysis.insights,
              }}
            />
          </div>

          <Report
            total={analysis.total}
            campaigns={analysis.campaigns}
            ads={analysis.ads}
            keywords={analysis.keywords}
            devices={analysis.devices}
            ages={analysis.ages}
            genders={analysis.genders}
            rows={analysis.rows}
            insights={analysis.insights}
          />
        </div>
      )}
    </main>
  );
}
