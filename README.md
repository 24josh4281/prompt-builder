# 프롬프트 완성기 — 직장인을 위한 AI 프롬프트 45

PDF 「직장인을 위한 AI 프롬프트 45」의 프롬프트를 웹에서 바로 완성하고 복사하는 정적 웹앱입니다.
상황을 고르면 "이것만 준비하세요" 항목이 입력 폼으로 나타나고, 입력하는 즉시 완성 프롬프트가 조립됩니다.
[프롬프트 복사] 버튼으로 ChatGPT · Claude · Gemini에 붙여 넣으세요.

## 실행

빌드나 서버 없이 동작합니다.

- `index.html`을 브라우저에서 열기 (더블클릭)
- 또는 로컬 서버: `python -m http.server 8765` 후 http://localhost:8765
- GitHub Pages / Netlify 등 정적 호스팅에 폴더째 올려도 됩니다

## 기능

- 7개 PART · 45개 프롬프트 목록, 제목·소분류·키워드 검색 (`/` 키로 검색창 포커스)
- 프롬프트별 입력 폼 (라벨 = 준비 항목, placeholder = PDF 예시)
- 실시간 미리보기: 입력값은 초록, 비어 있는 칸은 노란 `[확인 필요: …]`
- [프롬프트 복사] (`Ctrl/⌘ + Enter`), [예시로 채우기], [초기화]
- 입력값은 브라우저 localStorage에 프롬프트별로 저장, 새로고침해도 유지
- URL 해시로 직접 접근 (`index.html#3-3`), 라이트/다크 테마, 모바일 대응

## 파일 구조

```
index.html / styles.css / app.js   앱
data/parts/*.json                  PDF에서 추출한 원본 데이터 (PART별)
data/prompts.json                  병합 결과
data/prompts.js                    앱이 로드하는 생성 파일 (window.PROMPTS)
scripts/build-data.py              병합 + 검증 + prompts.js 생성
docs/                              PDCA 문서 (plan / design)
```

## 데이터 수정

`data/parts/*.json`을 고친 뒤 아래를 실행하면 검증(플레이스홀더 ↔ 필드 일치 등) 후 `data/prompts.js`가 다시 생성됩니다.

```bash
python scripts/build-data.py
```

템플릿의 `{{키}}`는 `fields[].key`와 1:1로 일치해야 합니다.
