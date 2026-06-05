# Google Ads 조회수 분석 리포트

구글 애즈(Google Ads)에서 내보낸 Excel/CSV 데이터를 업로드하면, **유튜브 채널 홍보·조회수 견인** 관점으로 자동 분석해 보고서로 출력하는 웹앱입니다.

## 주요 기능

- 📤 **Excel/CSV 업로드 (다중 파일 지원)** — 드래그&드롭 또는 파일 선택 (`.xlsx`, `.csv`). 캠페인별로 나뉜 여러 파일을 한꺼번에 올리면 **합쳐서** 분석합니다.
- 🔒 **브라우저 내 처리** — 데이터가 서버로 전송되지 않아 안전 (SheetJS)
- 🧮 **핵심 지표 자동 계산** — 조회수, CPV(조회당 비용), 조회율, CTR, CPM 등
- 🏆 **조회수 견인 캠페인/키워드 순위** — 어떤 요소가 조회수를 끌어왔는지
- 📈 **기간별 추이 차트** — 조회수와 CPV 추세
- 💬 **자동 인사이트 코멘트** — 효율 좋은/점검 필요한 항목을 텍스트로 요약
- 🖨️ **PDF 저장 / 인쇄** — 보고서를 그대로 출력

## 기술 스택

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Recharts (차트)
- SheetJS (xlsx 파싱)

## 로컬 실행

```bash
npm install
npm run dev
# http://localhost:3000
```

## Vercel 배포

1. 이 저장소를 GitHub에 푸시
2. [vercel.com](https://vercel.com)에서 New Project → 저장소 import
3. 프레임워크가 Next.js로 자동 감지됨 → Deploy 클릭

별도 환경 변수나 백엔드가 필요 없습니다.

## 입력 데이터 형식

Google Ads에서 캠페인/키워드 리포트를 Excel 또는 CSV로 내보내면 됩니다.
한국어/영어 헤더를 모두 자동 인식합니다. 인식하는 주요 컬럼:

| 표준 필드 | 인식 헤더 예시 |
| --- | --- |
| 캠페인 | 캠페인, Campaign |
| 키워드 | 키워드, Keyword |
| 노출수 | 노출수, Impressions |
| 조회수 | 조회수, Views |
| 클릭수 | 클릭수, Clicks |
| 비용 | 비용, Cost |
| 날짜 | 날짜, Day, Date |

`sample-data.csv`(여러 캠페인이 한 파일에) 또는 `sample-campaign-shorts.csv` + `sample-campaign-music.csv`(캠페인별로 분리된 파일을 동시에 업로드)로 바로 테스트해 볼 수 있습니다.

> 캠페인별로 분리된 파일에 **캠페인명 컬럼이 없으면 파일 이름을 캠페인 이름으로 자동 사용**합니다.
