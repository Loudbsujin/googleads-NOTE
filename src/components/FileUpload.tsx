"use client";

import { useCallback, useState } from "react";

interface Props {
  onFiles: (files: File[]) => void;
  loading: boolean;
}

export default function FileUpload({ onFiles, loading }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files ?? []);
      if (files.length) onFiles(files);
    },
    [onFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 border-dashed p-10 text-center transition ${
        dragging ? "border-brand bg-blue-50" : "border-gray-300 bg-white"
      }`}
    >
      <div className="text-5xl">📊</div>
      <p className="mt-4 text-lg font-semibold">
        Google Ads Excel 파일을 여기에 끌어다 놓으세요
      </p>
      <p className="mt-1 text-sm text-gray-500">
        .xlsx 또는 .csv · <strong>여러 개를 한꺼번에</strong> 올리면 합쳐서
        분석합니다 · 데이터는 브라우저 안에서만 처리됩니다
      </p>

      <label className="mt-6 inline-block cursor-pointer rounded-lg bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark">
        {loading ? "분석 중…" : "파일 선택 (여러 개 가능)"}
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          multiple
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onFiles(files);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}
