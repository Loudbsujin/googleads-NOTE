"use client";

import { useCallback, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  loading: boolean;
}

export default function FileUpload({ onFile, loading }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
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
        .xlsx 또는 .csv · 데이터는 브라우저 안에서만 처리되며 서버로 전송되지
        않습니다
      </p>

      <label className="mt-6 inline-block cursor-pointer rounded-lg bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark">
        {loading ? "분석 중…" : "파일 선택"}
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          disabled={loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </label>
    </div>
  );
}
