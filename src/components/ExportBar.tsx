"use client";

import { useState } from "react";
import {
  ExportInput,
  buildCsv,
  buildJson,
  buildMarkdown,
  downloadText,
} from "@/lib/export";

interface Props {
  input: ExportInput;
}

export default function ExportBar({ input }: Props) {
  const [withPrompt, setWithPrompt] = useState(true);
  const [copied, setCopied] = useState(false);

  const baseName = input.fileName.replace(/\.[^.]+$/, "") || "google-ads-report";

  async function copyMarkdown() {
    const md = buildMarkdown(input, withPrompt);
    try {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 클립보드 권한 실패 시 파일로 대체 다운로드
      downloadText(`${baseName}-AI요약.md`, md, "text/markdown");
    }
  }

  return (
    <div className="no-print rounded-xl border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-gray-700">
        🤖 다른 AI로 분석 보내기
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={copyMarkdown}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
        >
          {copied ? "✓ 복사됨!" : "📋 AI 분석용 요약 복사"}
        </button>
        <button
          onClick={() =>
            downloadText(`${baseName}.json`, buildJson(input), "application/json")
          }
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          📄 JSON 내보내기
        </button>
        <button
          onClick={() => downloadText(`${baseName}.csv`, buildCsv(input), "text/csv")}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
        >
          📊 CSV 내보내기
        </button>

        <label className="ml-1 flex cursor-pointer items-center gap-1.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={withPrompt}
            onChange={(e) => setWithPrompt(e.target.checked)}
            className="h-4 w-4"
          />
          분석 프롬프트 동봉
        </label>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        요약을 복사한 뒤 ChatGPT·Claude·Gemini 등 아무 AI 채팅창에 붙여넣으면 바로
        분석이 시작됩니다.
      </p>
    </div>
  );
}
