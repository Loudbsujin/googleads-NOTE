"use client";

import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import Report from "@/components/Report";
import ExportBar from "@/components/ExportBar";
import { parseFile } from "@/lib/parse";
import {
  GroupResult,
  Metrics,
  NormalizedRow,
  computeMetrics,
  groupBy,
  normalizeRows,
} from "@/lib/metrics";
import { Insight, buildInsights } from "@/lib/insights";

interface Analysis {
  total: Metrics;
  campaigns: GroupResult[];
  keywords: GroupResult[];
  rows: NormalizedRow[];
  insights: Insight[];
  fileName: string;
}

export default function Home() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const rawRows = await parseFile(file);
      const { rows } = normalizeRows(rawRows);

      if (rows.length === 0) {
        throw new Error(
          "분석할 데이터를 찾지 못했습니다. Google Ads에서 내보낸 Excel/CSV가 맞는지 확인해 주세요."
        );
      }

      const total = computeMetrics(rows);
      const campaigns = groupBy(rows, "campaign");
      const keywords = groupBy(rows, "keyword");
      const insights = buildInsights(total, campaigns, keywords);

      setAnalysis({
        total,
        campaigns,
        keywords,
        rows,
        insights,
        fileName: file.name,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일 분석 중 오류가 발생했습니다.");
      setAnalysis(null);
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
          보고서로 보여드립니다.
        </p>
      </header>

      <div className="no-print">
        <FileUpload onFile={handleFile} loading={loading} />
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
              분석 파일: <span className="font-medium">{analysis.fileName}</span>
            </div>
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              PDF로 저장 / 인쇄
            </button>
          </div>

          <div className="mb-6">
            <ExportBar
              input={{
                fileName: analysis.fileName,
                total: analysis.total,
                campaigns: analysis.campaigns,
                keywords: analysis.keywords,
                insights: analysis.insights,
              }}
            />
          </div>

          <Report
            total={analysis.total}
            campaigns={analysis.campaigns}
            keywords={analysis.keywords}
            rows={analysis.rows}
            insights={analysis.insights}
          />
        </div>
      )}
    </main>
  );
}
