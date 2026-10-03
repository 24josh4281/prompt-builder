# consultant-ppt Design Document

> **Feature**: consultant-ppt · **Level**: Starter · **Date**: 2026-10-03 · **Status**: Draft
> **Plan**: `docs/01-plan/features/consultant-ppt.plan.md` · **Base**: prompt-builder design v0.1

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 컨설팅 덱 제작은 다단계·맥락 의존 작업인데 단발 프롬프트로는 맥락이 끊기고 반복 입력이 많음 |
| **WHO** | 컨설턴트·기획자(본인), 기존 prompt-builder 사용자 |
| **RISK** | 스키마 확장의 하위 호환; AI 결과는 사용자가 붙여 넣어야 함 |
| **SUCCESS** | PPT 8개 완성·복사, 6단계 체인 값 전달, 프로젝트 정보 자동 삽입, 커스텀 CRUD·내보내기 |
| **SCOPE** | 정적 앱 확장. 서버·AI 호출 없음 |

## 1. Overview

### 1.1 Design Goals
1. 기존 45개 프롬프트 코드 경로를 건드리지 않고 "속성이 있으면 켜지는" 방식으로 확장
2. 워크플로우는 데이터가 정의하고 앱은 해석만 한다(새 단계 추가 = JSON 한 줄)
3. 프로젝트 정보는 "한 번 입력, 어디서나 삽입"이되 프롬프트별로 덮어쓸 수 있다

### 1.2 Design Principles
- Optional-first 스키마, 기본값 = 기존 동작
- 상태는 여전히 localStorage + hash
- 커스텀 프롬프트도 내장 프롬프트와 같은 객체 모양으로 다뤄 코드 분기를 최소화

## 2. Architecture Options

### 2.0 Architecture Comparison
| 옵션 | 설명 | 복잡도 | 유지보수 | 노력 | 리스크 |
|------|------|:--:|:--:|:--:|:--:|
| A. app.js에 기능 직접 추가 | 기존 IIFE 안에 분기 추가 | 낮음 | 중(파일 비대) | 작음 | 회귀 가능 |
| B. 모듈 분리(ES modules + 번들) | features/*.js로 분할, 빌드 도입 | 높음 | 높음 | 큼 | file:// 모듈 제약 |
| **C. app.js 내부 섹션 분리 + 데이터 주도 (선택)** | IIFE 유지, `profile`/`workflow`/`custom` 섹션으로 구획, 동작은 데이터 속성이 결정 | 중 | 높음 | 중 | 낮음 |

**선택: C** — 빌드 없는 제약을 지키면서 기능별 경계를 코드 섹션과 데이터 속성으로 확보.

### 2.1 Component Diagram
```
index.html
├─ <header> … + [프로젝트 정보] 버튼 + [내 프롬프트 추가] 버튼
├─ <aside id="list">  PART 1~7 · PART 8 컨설팅 PPT · PART ★ 내 프롬프트(편집·삭제 아이콘)
└─ <main id="detail">
   ├─ .meta (기존)
   ├─ .stepper        워크플로우일 때만: ① ② ③ … 현재 단계 강조, 클릭 이동
   ├─ .work
   │  ├─ .form-pane   fields → text | textarea | select(datalist) | project(자동값 + "프로젝트 정보에서" 배지) | previous(최상단, 안내문)
   │  └─ .preview-pane (기존) + [이전 단계]/[다음 단계] 버튼(워크플로우일 때)
   └─ .article
<dialog id="profile-dialog">  프로젝트 정보 6항목 폼, 저장/지우기
<dialog id="custom-dialog">   제목·분류·프롬프트 본문([빈칸] 문법)·추출된 필드 미리보기·예시 입력, 저장/삭제
```

### 2.2 Data Flow
```
PROMPTS(내장) ∪ store[pb:custom] ──► ALL ──► list/search/select (기존)
store[pb:project] ──► profile ──┐
state.values ───────────────────┴─► resolveValues(prompt) ─► compile ─► preview/copy
[다음 단계] ─► nextStep = ALL.find(workflow.id==cur.id && step==cur.step+1)
            ─► carry: for key in next.fields (type ≠ previous): if !next.values[key] && cur.values[key] → copy
            ─► select(next.id) + toast("이전 단계 AI 결과를 붙여 넣으세요")
custom-dialog save ─► parse [빈칸] → fields → upsert store[pb:custom] → renderList
```

### 2.3 Dependencies
없음. `<dialog>` 네이티브 요소 사용(모든 최신 브라우저 지원).

## 3. Data Model

### 3.1 Entity Definition (v2, 하위 호환)
```ts
interface Prompt {                 // 기존 속성 그대로 +
  tags?: string[];                 // 검색용
  workflow?: { id: string; step: number; total: number; label: string };
  custom?: true;                   // localStorage 출처
}
interface Field {                  // 기존 key/label/example/multiline +
  type?: "text" | "select" | "project" | "previous";   // 기본 "text"
  options?: string[];              // select
  projectKey?: ProjectKey;         // project
  hint?: string;                   // 입력 아래 도움말
}
type ProjectKey = "client" | "industry" | "project" | "audience" | "deckType" | "tone";
interface Profile { client: string; industry: string; project: string; audience: string; deckType: string; tone: string }
```
불변 조건(빌드 검증 추가): `select`는 options ≥ 2, `project`는 projectKey ∈ ProjectKey, workflow는 같은 id 내 step 1..total 연속·유일.

### 3.2 Storage
| 키 | 값 |
|----|----|
| `pb:values:<id>` | `{ [key]: string }` (기존) |
| `pb:project` | Profile |
| `pb:custom` | Prompt[] (custom: true, part: 99, partTitle "내 프롬프트") |
| `pb:theme` | 기존 |

### 3.3 값 해석 규칙 (resolveValues)
```
for field in prompt.fields:
  v = values[field.key]
  if (!v && field.type === "project") v = profile[field.projectKey]
  resolved[field.key] = v || ""
```
`project` 필드 입력칸은 사용자가 비워 두면 프로필 값이 placeholder가 아니라 **실제 값으로 미리보기에 삽입**되고, 입력하면 그 프롬프트에서만 덮어쓴다.

## 4. API Specification (내부 함수 계약)
| 함수 | 입력 → 출력 |
|------|-------------|
| `allPrompts()` | → 내장 PROMPTS + 커스텀 병합 배열(정렬: part, id) |
| `resolveValues(prompt)` | → `{key: string}` (§3.3) |
| `compile(prompt, values)` | 기존과 동일, `values`에 resolve 결과 전달 |
| `workflowSiblings(prompt)` | → 같은 workflow.id의 Prompt[] step 순 |
| `goStep(delta)` | 현재 단계 ± delta로 이동, 공통 키 값 carry |
| `parseCustomTemplate(src)` | `[빈칸]` → `{{빈칸}}` 변환 + fields 추출(섹션 라벨 제외) → `{template, fields}` |
| `saveCustom(prompt)` / `deleteCustom(id)` / `exportCustom()` / `importCustom(json)` | localStorage CRUD |

## 5. UI/UX Design

### 5.1 Screen Layout
- 헤더 우측에 두 버튼 추가: `프로젝트 정보`(저장돼 있으면 클라이언트명 배지), `+ 내 프롬프트`
- 상세 상단 스테퍼: 가로 6칸, 현재 단계 강조, 완료 단계(입력값 있음) 체크 표시. 모바일은 가로 스크롤
- 미리보기 하단 copy-bar에 `← 이전 단계` / `다음 단계 →` 추가(워크플로우일 때)
- `previous` 필드는 폼 최상단, 연한 강조 박스 + 안내: "①단계 프롬프트를 AI에 넣고 받은 결과를 그대로 붙여 넣으세요"

### 5.2 User Flow (워크플로우)
1. 프로젝트 정보 입력(선택) → PART 8 ① 선택
2. 폼 채우기 → 복사 → AI에서 결과 받기
3. [다음 단계 →] → ②로 이동, 프로젝트·공통 값 자동 채움, 토스트 안내
4. "이전 단계 AI 결과"에 붙여 넣기 → 복사 → … ⑥까지 반복

### 5.3 Component List
기존 + stepper, step-nav(copy-bar 내), profile-btn/profile-dialog, custom-btn/custom-dialog, field-select(datalist), field-project(배지), field-previous, card-actions(편집·삭제, 커스텀만)

### 5.4 Page UI Checklist
- [ ] 스테퍼 현재 단계·완료 단계 구분
- [ ] project 필드에 "프로젝트 정보" 배지와 자동값 표시
- [ ] 프로필 저장 시 열린 프롬프트 미리보기 즉시 갱신
- [ ] 커스텀 모달에서 템플릿 입력 중 추출 필드 실시간 표시, 0개면 경고
- [ ] 커스텀 카드에 편집/삭제, 삭제는 confirm
- [ ] 내보내기(JSON 다운로드)·가져오기(파일 선택, 병합)

## 6. Error Handling
| 상황 | 처리 |
|------|------|
| 워크플로우 다음 단계 없음 | 버튼 비활성 |
| 커스텀 템플릿에 플레이스홀더 0개 | 저장은 허용하되 경고 토스트 |
| 가져오기 JSON 형식 오류 | 토스트 "형식이 올바르지 않아요", 변경 없음 |
| localStorage 용량 초과 | 토스트 안내, 메모리 상태 유지 |
| `<dialog>` 미지원 | `showModal` 없으면 `open` 속성 폴백 |

## 7. Security Considerations
- 커스텀 템플릿·가져오기 데이터는 모두 escape 후 렌더(기존 compile 경로 재사용)
- 가져오기는 허용 속성만 복사(화이트리스트)

## 8. Test Plan

### 8.1 데이터 검증(스크립트)
- part-8.json 8개, workflow deck step 1..6 연속, select options ≥ 2, projectKey 유효, 플레이스홀더↔필드 일치

### 8.2 L2: UI Action
1. 프로필 저장 → 8-1 열기 → 클라이언트 필드 자동값·배지 표시, 미리보기에 삽입
2. 8-1 "클라이언트" 칸에 프로필과 다른 값을 직접 입력 → [다음 단계] → 8-2 같은 키(클라이언트)에 그 값이 자동 채움, previous 필드 최상단
3. 프레임워크 datalist에서 "SCQA" 선택 → 미리보기 반영
4. 내 프롬프트 생성(`[고객사]`, `[목표]`) → 목록 표시 → 폼 2개 → 복사 → 편집 제목 변경 → 삭제
5. 기존 1-1, 3-3, 5-3 기존 동작 확인

### 8.3 L3: E2E
"프로필 입력 → ①~⑥ 순서로 이동하며 각 단계 복사, 모든 복사본에 `{{` 없음, 프로젝트 값 포함"

## 9. Clean Architecture (경량)
`data/` → `app.js`(sections: core / profile / workflow / custom) → `index.html` / `styles.css`

## 10. Coding Convention
기존 유지. 신규 localStorage 키는 `pb:` 접두사. 커스텀 id `u-` 접두사.

## 11. Implementation Guide

### 11.1 File Structure
```
data/parts/part-8.json      (신규) PART 8 프롬프트 8개
scripts/build-data.py       (수정) v2 검증
index.html                  (수정) 헤더 버튼, 스테퍼, 두 개의 <dialog>
styles.css                  (수정) stepper, dialog, field variants
app.js                      (수정) allPrompts/resolveValues/workflow/profile/custom
README.md                   (수정)
```

### 11.2 Implementation Order
1. part-8.json 작성 → build-data.py 검증 확장 → 빌드
2. index.html/styles.css: 스테퍼·다이얼로그·필드 변형
3. app.js: resolveValues + 필드 타입 렌더 → 프로필 → 워크플로우 → 커스텀
4. 브라우저 검증(§8)

### 11.3 Session Guide
| Module | 내용 | 파일 |
|--------|------|------|
| module-1 | PART 8 콘텐츠 + 검증 | data/parts/part-8.json, scripts/build-data.py |
| module-2 | 프로필 + 필드 타입 | app.js, index.html, styles.css |
| module-3 | 워크플로우 스테퍼 | app.js, index.html, styles.css |
| module-4 | 커스텀 프롬프트 CRUD | app.js, index.html, styles.css |

## Version History
| 버전 | 날짜 | 변경 |
|------|------|------|
| 0.1 | 2026-10-03 | 초안, 옵션 C 선택 |
| 0.2 | 2026-10-03 | 갭 분석 반영: carry 규칙에 previous 제외 명시, §8.2-2 테스트 문구 정정, 내 프롬프트 예시 입력 UI 구현 |
