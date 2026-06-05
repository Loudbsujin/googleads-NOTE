import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Google Ads 조회수 분석 리포트",
  description:
    "구글 애즈 Excel 데이터를 업로드하면 조회수 견인 요소를 자동 분석해 보고서로 출력합니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
