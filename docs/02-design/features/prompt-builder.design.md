# prompt-builder Design Document

> **Feature**: prompt-builder · **Level**: Starter · **Date**: 2026-10-03 · **Status**: Draft
> **Plan**: `docs/01-plan/features/prompt-builder.plan.md`

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | PDF 프롬프트의 `[빈칸]` 치환 반복 작업과 누락 제거 |
| **WHO** | PDF 소유 직장인(비개발자), 모바일·데스크톱 브라우저 |
| **RISK** | 추출 데이터 왜곡, 플레이스홀더↔필드 불일치 |
| **SUCCESS** | 45개 전부 폼 완성·복사 가능, 치환 100%, 복사 성공 |
| **SCOPE** | 정적 1페이지 앱 + 데이터 파일. 서버·AI 호출 없음 |

## 1. Overview

### 1.1 Design Goals
1. 상황 찾기 → 입력 → 복사까지 3단계, 클릭 최소화
2. 입력하는 동안 완성 프롬프트가 옆에서 실시간으로 바뀌어 "무엇이 들어가는지" 보이게
3. 어떤 환경(`file://`, GitHub Pages, 사내 서버)에서도 빌드 없이 동작

### 1.2 Design Principles
- 데이터(콘텐츠)와 동작(앱) 분리. 콘텐츠 수정은 JSON만 고치면 됨
- 외부 의존성 0 (CDN·프레임워크 없음)
- 상태는 URL 해시(선택 프롬프트) + localStorage(입력값)에만 존재

## 2. Architecture Options

### 2.0 Architecture Comparison
| 옵션 | 설명 | 복잡도 | 유지보수 | 노력 | 리스크 |
|------|------|:--:|:--:|:--:|:--:|
| A. 단일 HTML 파일 | HTML+CSS+JS+데이터 전부 한 파일 | 낮음 | 낮음(데이터·코드 혼재) | 최소 | 데이터 수정 시 코드 건드림 |
| B. 번들러 + 컴포넌트 프레임워크 | Vite + Svelte/React | 높음 | 높음 | 큼 | Starter에 과함, 빌드 필요 |
| **C. 정적 3파일 분리 (선택)** | `index.html` / `styles.css` / `app.js` + `data/prompts.js` | 낮음 | 높음 | 작음 | 없음 |

**선택: C** — 빌드 없이 동작하면서 데이터와 코드가 분리됨. `data/prompts.json`을 원본(source of truth)으로 두고, `scripts/build-data.py`가 `data/prompts.js`(`window.PROMPTS = [...]`)를 생성해 `file://`에서도 fetch 없이 로드.

### 2.1 Component Diagram
```
index.html
├─ <header>  앱 제목 · 검색창 · 테마 토글
├─ <aside id="list">   PART 아코디언 → 프롬프트 카드(제목, 소분류)
└─ <main id="detail">
   ├─ .meta      제목 · PART/소분류 배지 · "이렇게 달라져요" · [사용 전 안내]
   ├─ .form      fields[] → <label>+<input|textarea> (placeholder=예시)
   │             [예시로 채우기] [초기화]
   ├─ .preview   완성 프롬프트(치환 부분 <mark>, 빈 값 <mark class="missing">)
   │             [프롬프트 복사] ← 고정(sticky) 버튼
   └─ .article   "한 걸음 더" 퍼블리 아티클 제목
```

### 2.2 Data Flow
```
prompts.js(PROMPTS) ─► render list ─► click/hash ─► select(id)
                                                    │
localStorage[pb:<id>] ─► load values ─► render form ◄┘
        ▲                      │ input event
        └──── save ◄── state.values ──► compile(template, values) ──► preview
                                                                  └─► copy → navigator.clipboard
```

### 2.3 Dependencies
없음. 시스템 폰트 스택만 사용.

## 3. Data Model

### 3.1 Entity Definition
```ts
interface Prompt {
  id: string;          // "1-1"
  part: number;        // 1..7
  partTitle: string;   // "찾아보고 분석할 때"
  category: string;    // "자료조사"
  title: string;       // 상황 제목
  benefits: string[];  // "이렇게 달라져요"
  notice: string;      // [사용 전 안내] 또는 ""
  fields: Field[];     // 템플릿의 {{key}} 순서, 중복 제거
  template: string;    // "[역할] 너는 {{직무·분야}}에 ..."
  article: string;     // 퍼블리 아티클 제목
}
interface Field { key: string; label: string; example: string; multiline: boolean; }
```
불변 조건: `set(template의 {{…}}) == set(fields.key)`. `scripts/build-data.py`가 검증하고 위반 시 실패.

### 3.2 Storage
- `localStorage["pb:values:<id>"]` = `{ [key]: string }`
- `localStorage["pb:theme"]` = `"light" | "dark"` (미설정 시 시스템 따름)
- `location.hash` = `#<id>`

## 4. API Specification
해당 없음(서버 없음). 내부 함수 계약:

| 함수 | 입력 | 출력 |
|------|------|------|
| `compile(prompt, values)` | Prompt, {key:string} | `{ text, html, missing[] }` — text는 빈 값 → `[확인 필요: 라벨]`, html은 치환부 `<mark>` 래핑(escape 적용) |
| `search(query)` | string | Prompt[] — title/category/partTitle/benefits/fields.label 포함 검색(공백 무시) |
| `copyText(text)` | string | Promise<boolean> — clipboard API, 실패 시 textarea+execCommand 폴백 |

## 5. UI/UX Design

### 5.1 Screen Layout
- 데스크톱(≥900px): 좌측 목록 320px 고정 + 우측 상세(폼 / 미리보기 2열, ≥1200px)
- 모바일: 목록이 첫 화면, 카드 탭 → 상세 전체 화면, 상단 [← 목록] 버튼. 복사 버튼은 하단 고정

### 5.2 User Flow
1. 진입 → PART 1 펼침
2. 검색/탭 → 프롬프트 선택(해시 갱신)
3. 폼 입력 → 미리보기 실시간 갱신, 저장
4. [프롬프트 복사] → 토스트 "복사됐어요. AI에 붙여 넣으세요"
5. 필요 시 [초기화]

### 5.3 Component List
header, search-input, theme-toggle, part-group(details/summary), prompt-card, detail-meta, benefit-list, notice-box, field-row(input/textarea, 자동 높이), fill-example-btn, reset-btn, preview-pane, copy-btn(sticky), toast, empty-state

### 5.4 Page UI Checklist
- [ ] 목록에서 선택된 카드 하이라이트
- [ ] 입력 진행 카운트 (`n/총 입력됨`)
- [ ] 미리보기에서 빈 값은 강조색 `[확인 필요: …]`
- [ ] 복사 성공/실패 토스트
- [ ] 검색 결과 0건 empty-state
- [ ] 키보드: `/` 검색 포커스, `Ctrl/⌘+Enter` 복사

## 6. Error Handling
| 상황 | 처리 |
|------|------|
| 해시의 id 없음 | 첫 프롬프트 선택, 해시 교체 |
| localStorage 접근 불가 | try/catch, 메모리 상태로만 동작 |
| 클립보드 거부 | 폴백 → 실패 시 "미리보기를 길게 눌러 복사하세요" 토스트 + 미리보기 전체 선택 |
| 데이터 로드 실패(PROMPTS 미정의) | 화면에 안내 메시지 |

## 7. Security Considerations
- 사용자 입력은 escape 후 삽입(XSS 방지)
- 데이터는 로컬에만 저장, 네트워크 전송 없음

## 8. Test Plan

### 8.1 Test Scope
L1(API) 해당 없음. L2 UI 동작, L3 E2E를 브라우저로 검증.

### 8.2 데이터 검증(스크립트)
- 45개, id 유일, part 1..7, template 플레이스홀더 == fields.key, 빈 title/template 없음, 섹션 라벨 4종 존재

### 8.3 L2: UI Action
1. 카드 클릭 → 상세 제목 일치, 해시 `#id`
2. 필드 입력 → 미리보기 해당 위치 치환 + `<mark>`
3. 빈 필드 → `[확인 필요: 라벨]` 표시
4. [복사] → 클립보드 내용 == 미리보기 텍스트
5. 새로고침 → 값 복원
6. 검색 "회의" → 관련 카드만 표시

### 8.4 L3: E2E
"1-1 선택 → 4개 필드 입력 → 복사 → 붙여 넣기 결과에 `{{`·`[확인 필요` 없음"

## 9. Clean Architecture (경량)
- `data/`(콘텐츠) → `app.js`(상태·렌더) → `index.html`(뼈대) · `styles.css`(표현). 역방향 의존 없음.

## 10. Coding Convention
- kebab-case 파일, camelCase 함수, 상수 UPPER_SNAKE
- DOM id는 명사형; data-attribute로 이벤트 위임

## 11. Implementation Guide

### 11.1 File Structure
```
Prompt for Consultants/
├─ index.html
├─ styles.css
├─ app.js
├─ data/
│  ├─ parts/part-1-2.json, part-3-4.json, part-5-7.json   (추출 원본)
│  ├─ prompts.json      (병합 결과, source of truth)
│  └─ prompts.js        (생성물: window.PROMPTS)
├─ scripts/build-data.py (병합 + 검증 + prompts.js 생성)
└─ docs/…
```

### 11.2 Implementation Order
1. `scripts/build-data.py` — parts 병합·검증·prompts.js 생성
2. `index.html` 뼈대 + `styles.css` 토큰/레이아웃/다크모드
3. `app.js` — 데이터 로드, 목록/검색, 선택, 폼, compile, 미리보기, 복사, 저장, 키보드
4. 브라우저 실측(L2/L3), 모바일 폭 확인

### 11.3 Session Guide
| Module | 내용 | 파일 |
|--------|------|------|
| module-1 | 데이터 파이프라인 | `data/*`, `scripts/build-data.py` |
| module-2 | UI 뼈대·스타일 | `index.html`, `styles.css` |
| module-3 | 앱 로직 | `app.js` |
| module-4 | 검증 | 브라우저 테스트 |

## Version History
| 버전 | 날짜 | 변경 |
|------|------|------|
| 0.1 | 2026-10-03 | 초안, 옵션 C 선택 |
