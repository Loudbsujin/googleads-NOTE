"use client";

import { useState } from "react";

// 업로드 전 안내: 구글 애즈에서 내보낼 때 포함해야 할 열과 주의사항.
export default function UploadGuide() {
  const [open, setOpen] = useState(true);

  return (
    <div className="no-print mt-4 rounded-xl border border-blue-200 bg-blue-50">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold text-blue-900">
          📋 업로드 전 안내 — 내보낼 때 이 열들을 포함하세요
        </span>
        <span className="text-blue-500">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-blue-200 px-4 py-4 text-sm">
          <p className="text-gray-600">
            구글 애즈 → 보고서 화면 → <b>열(측정항목) 편집</b>에서 아래 항목을
            추가한 뒤 <b>.csv 또는 .xlsx</b>로 다운로드하세요. 한국어/영어 헤더
            모두 자동 인식합니다.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <GuideCol
              title="필수 (기본 분석)"
              tone="red"
              items={[
                "광고 이름",
                "노출수",
                "조회수 (TrueView 조회수)",
                "클릭수",
                "비용",
                "통화 코드",
              ]}
            />
            <GuideCol
              title="채널 성장 (권장)"
              tone="green"
              items={[
                "획득 조회수",
                "구독 수 (획득 구독자)",
                "★ YouTube channel subscriptions (구독 전환)",
                "동영상 25/50/75/100% 재생",
              ]}
            />
            <GuideCol
              title="세부 분석 (선택)"
              tone="gray"
              items={["날짜", "기기", "연령", "성별"]}
            />
          </div>

          <div className="rounded-lg bg-white p-3 text-xs text-gray-600">
            <p className="mb-1 font-semibold text-gray-700">⚠️ 정확도 팁</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>
                <b>구독 전환</b>이 목표라면{" "}
                <b>“YouTube channel subscriptions”</b> 전환 열을 꼭 추가하세요.
                <b>“구독 수(획득 구독자)”</b>와는 다른 값입니다.
              </li>
              <li>
                <b>광고 보고서</b>는 <b>삭제된 광고</b>의 실적이 빠집니다. 총액을
                대시보드와 맞추려면 <b>전체 캠페인</b>을 같은 시점에 내보내세요.
              </li>
              <li>
                캠페인별로 파일이 나뉘어도 <b>여러 개를 한꺼번에</b> 올리면
                합산됩니다. (캠페인명 열이 없으면 <b>파일명</b>이 캠페인 이름이
                됩니다)
              </li>
              <li>
                엔화·달러 등 <b>외화는 자동으로 원화로 환산</b>됩니다 (환율 직접
                수정 가능).
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function GuideCol({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "red" | "green" | "gray";
}) {
  const dot =
    tone === "red"
      ? "text-red-500"
      : tone === "green"
      ? "text-green-600"
      : "text-gray-400";
  return (
    <div className="rounded-lg bg-white p-3">
      <div className="mb-2 text-xs font-semibold text-gray-700">{title}</div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it} className="flex gap-1.5 text-xs text-gray-600">
            <span className={dot}>•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
