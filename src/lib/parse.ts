// 업로드된 .xlsx/.csv 파일을 파싱해 원본 행 배열로 변환.
// 브라우저에서 SheetJS로 처리하므로 데이터가 외부로 전송되지 않는다.

import * as XLSX from "xlsx";
import { RawRow } from "./metrics";

export async function parseFile(file: File): Promise<RawRow[]> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // xlsx/xls 바이너리(zip은 PK, 구버전 xls는 D0CF)는 바이너리로 읽고,
  // 그 외 텍스트(csv/tsv)는 BOM으로 인코딩을 감지해 문자열로 읽는다.
  // 구글 애즈 한글 내보내기는 UTF-16LE + 탭 구분이라 UTF-8로 읽으면 깨진다.
  const isBinary =
    (bytes[0] === 0x50 && bytes[1] === 0x4b) || // "PK" (xlsx)
    (bytes[0] === 0xd0 && bytes[1] === 0xcf); // (구버전 xls)

  let workbook;
  if (isBinary) {
    workbook = XLSX.read(buffer, { type: "array" });
  } else {
    let enc = "utf-8";
    if (bytes[0] === 0xff && bytes[1] === 0xfe) enc = "utf-16le";
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) enc = "utf-16be";
    const text = new TextDecoder(enc).decode(buffer);
    workbook = XLSX.read(text, { type: "string" });
  }
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
    .filter((obj) => Object.values(obj).some((v) => v !== "" && v != null))
    // 요약(합계) 행 제거. 구글 애즈는 "전체: 삭제되지 않은 광고", "전체: 캠페인",
    // "총계", "Total: ..." 등으로 표기하며, 이를 데이터로 합산하면 과다 집계된다.
    .filter((obj) => !Object.values(obj).some((v) => isSummaryLabel(String(v ?? ""))));
}

// "전체: ...", "총계: ...", "총계", "Total" 같은 요약 라벨인지 판별.
function isSummaryLabel(value: string): boolean {
  return (
    /^\s*(전체|총계|합계|total)\s*[:：]/i.test(value) || // 콜론이 붙은 요약 라벨
    /^\s*(총계|합계|total)\s*$/i.test(value) // 단독 총계/합계/Total
  );
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
