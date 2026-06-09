"use client";

import { useMemo, useState } from "react";
import FileUpload from "@/components/FileUpload";
import UploadGuide from "@/components/UploadGuide";
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
  detectCategories,
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
  const ads = groupBy(rows, "adLabel");
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
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("전체"); // 선택된 캠페인 유형
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 환산 + 유형 필터 → 분석 결과 (환율·유형이 바뀌면 자동 재계산)
  const analysis = useMemo(() => {
    if (!baseRows) return null;
    const converted = convertToKRW(baseRows, rates);
    const filtered =
      category === "전체"
        ? converted
        : converted.filter((r) => r.category === category);
    return analyze(filtered, fileNames);
  }, [baseRows, rates, fileNames, category]);

  async function handleFiles(files: File[]) {
    setLoading(true);
    setError(null);
    try {
      // 파일별로 파싱하고 ad-level(광고 실적, 광고 이름 열 있음) / campaign-level(캠페인 실적) 구분
      const parsed: { name: string; rows: NormalizedRow[]; isAdLevel: boolean }[] = [];
      const failed: string[] = []; // 형식을 못 읽은 파일
      const emptyFiles: string[] = []; // 읽었지만 실적(노출·비용 등)이 모두 0인 파일

      for (const file of files) {
        try {
          const rawRows = await parseFile(file);
          const { rows, mapping } = normalizeRows(
            rawRows,
            campaignNameFromFile(file.name)
          );
          if (rows.length === 0) {
            if (rawRows.length > 0) emptyFiles.push(file.name);
            else failed.push(file.name);
            continue;
          }
          parsed.push({ name: file.name, rows, isAdLevel: !!mapping.adName });
        } catch {
          failed.push(file.name);
        }
      }

      // 광고 실적과 캠페인 실적은 같은 데이터라 둘 다 합치면 2배 중복.
      // ad-level(광고 실적)이 있으면 그것만 쓰고 campaign-level(캠페인 실적)은 제외.
      const hasAdLevel = parsed.some((p) => p.isAdLevel);
      const used = hasAdLevel ? parsed.filter((p) => p.isAdLevel) : parsed;
      const dedupDropped = hasAdLevel
        ? parsed.filter((p) => !p.isAdLevel).map((p) => p.name)
        : [];
      const allRows = used.flatMap((p) => p.rows);

      if (allRows.length === 0) {
        if (emptyFiles.length > 0 && failed.length === 0) {
          throw new Error(
            "파일은 정상적으로 읽었지만, 노출·조회·클릭·비용이 모두 0인 광고만 있어 분석할 실적이 없습니다. 해당 기간에 노출이 발생한 광고가 포함된 파일을 올려주세요."
          );
        }
        throw new Error(
          "분석할 데이터를 찾지 못했습니다. Google Ads에서 내보낸 Excel/CSV가 맞는지 확인해 주세요."
        );
      }

      const okNames = used.map((p) => p.name);
      const foreign = detectForeignCurrencies(allRows);

      setBaseRows(allRows);
      setFileNames(okNames);
      setCurrencies(foreign);
      setCategories(detectCategories(allRows));
      setCategory("전체");

      const notices: string[] = [];
      if (failed.length > 0)
        notices.push(`읽지 못해 제외된 파일: ${failed.join(", ")}`);
      if (emptyFiles.length > 0)
        notices.push(`실적이 0이라 제외된 파일: ${emptyFiles.join(", ")}`);
      if (dedupDropped.length > 0)
        notices.push(
          `중복 제외: ${dedupDropped.join(
            ", "
          )} (광고 실적과 같은 데이터라 캠페인 실적은 합산에서 제외)`
        );
      setError(notices.length > 0 ? notices.join(" / ") : null);

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
        <UploadGuide />
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

          {/* 캠페인 유형 분류 필터 (동영상 / 디멘드젠) */}
          {categories.length > 1 && (
            <div className="mb-6">
              <div className="mb-2 text-sm font-semibold text-gray-700">
                캠페인 유형
              </div>
              <div className="inline-flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-white p-1">
                {["전체", ...categories].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                      category === c
                        ? "bg-brand text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                현재 보기: <b>{category}</b> — 구글애즈와
                프로모션(Youtube Promotion)을 분리해서 봅니다.
              </div>
            </div>
          )}

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
