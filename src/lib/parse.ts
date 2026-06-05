// 업로드된 .xlsx/.csv 파일을 파싱해 원본 행 배열로 변환.
// 브라우저에서 SheetJS로 처리하므로 데이터가 외부로 전송되지 않는다.

import * as XLSX from "xlsx";
import { RawRow } from "./metrics";

export async function parseFile(file: File): Promise<RawRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  // Google Ads 내보내기는 상단에 제목/기간 등 메타 행이 있는 경우가 많다.
  // 헤더로 보이는 행을 찾아 그 지점부터 파싱한다.
  const rows: unknown[][] = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    blankrows: false,
  });

  const headerIdx = findHeaderRow(rows);
  if (headerIdx === -1) {
    // 헤더를 못 찾으면 기본 파싱 시도
    return XLSX.utils.sheet_to_json(firstSheet, { defval: "" }) as RawRow[];
  }

  const headers = (rows[headerIdx] as unknown[]).map((h) => String(h ?? "").trim());
  const dataRows = rows.slice(headerIdx + 1);

  return dataRows
    .map((row) => {
      const obj: RawRow = {};
      headers.forEach((h, i) => {
        if (h) obj[h] = row[i] as string | number | undefined;
      });
      return obj;
    })
    .filter((obj) => Object.values(obj).some((v) => v !== "" && v != null));
}

// 노출수/조회수/비용 등 핵심 키워드가 포함된 행을 헤더로 판단.
function findHeaderRow(rows: unknown[][]): number {
  const signals = [
    "campaign",
    "캠페인",
    "impr",
    "노출",
    "조회",
    "views",
    "cost",
    "비용",
    "clicks",
    "클릭",
    "keyword",
    "키워드",
  ];
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const cells = (rows[i] || []).map((c) => String(c ?? "").toLowerCase());
    const hits = cells.filter((c) =>
      signals.some((s) => c.includes(s))
    ).length;
    if (hits >= 2) return i;
  }
  return -1;
}
