# consultant-ppt Gap Analysis Report

> **Feature**: consultant-ppt · **Level**: Starter (정적 웹, 서버·API 없음) · **Phase**: Check
> **Analysis Date**: 2026-10-03 · **Status**: Draft
> **Plan**: `docs/01-plan/features/consultant-ppt.plan.md` · **Design**: `docs/02-design/features/consultant-ppt.design.md` · **Base**: `docs/02-design/features/prompt-builder.design.md`
> **구현 범위**: `index.html`, `styles.css`, `app.js`, `scripts/build-data.py`, `data/parts/part-8.json` (8-1 ~ 8-8)
> **방식**: 정적 분석만 수행 (Runtime 미실행) → Match Rate = Structural×0.2 + Functional×0.4 + Contract×0.4

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | 컨설팅 덱 제작은 다단계·맥락 의존 작업인데 단발 프롬프트로는 맥락이 끊기고 반복 입력이 많음 |
| **WHO** | 컨설턴트·기획자(본인), 기존 prompt-builder 사용자 |
| **RISK** | 스키마 확장의 하위 호환; AI 결과는 사용자가 붙여 넣어야 함 |
| **SUCCESS** | PPT 8개 완성·복사, 6단계 체인 값 전달, 프로젝트 정보 자동 삽입, 커스텀 CRUD·내보내기 |
| **SCOPE** | 정적 앱 확장. 서버·AI 호출 없음 |

---

## 1. 점수 요약

| 축 | 점수 | 산출 | 상태 |
|----|:----:|------|:----:|
| Structural Match | **95.2%** | 20 / 21 항목 | ✅ |
| Functional Depth | **89.7%** | 26 / 29 점 | ⚠️ |
| Data Contract | **94.4%** | 17 / 18 점 | ✅ |
| **Overall (static)** | **92.7%** | 95.2×0.2 + 89.7×0.4 + 94.4×0.4 | ✅ |

- Critical 0 · Important 3 · Minor 11
- Placeholder/TODO/console.log 스텁: 발견 없음 (app.js 전체 정독)
- Plan Success Criteria 5개 모두 정적 근거상 충족. 브라우저 확인(§6)은 아직 필요

---

## 2. Plan Success Criteria (Plan §4.1)

| # | 기준 | 판정 | 근거 |
|---|------|:----:|------|
| SC-1 | part-8.json 8개 항목, 빌드 검증 통과(플레이스홀더↔필드, select 옵션, project 키) | ✅ | `data/parts/part-8.json` 8-1~8-8. 검증: `scripts/build-data.py:40-43`(플레이스홀더↔필드), `:61-62`(select ≥2), `:63-64`(projectKey), `:69-73`(workflow 1..total 연속·유일). 검증 성공 시에만 산출물을 쓰는데(`:76-87`) `data/prompts.json`에 8-x 8건이 있으므로 빌드 통과. 8개 템플릿의 플레이스홀더↔필드를 직접 대조해도 모두 일치 |
| SC-2 | 1단계 입력 → [다음 단계] → 2단계에 프로젝트 정보·공통 키 값 채워짐 | ✅ (정적) | 프로젝트 값 해석 `app.js:103-111`, 다음 단계 carry `app.js:210-228`, 버튼 `app.js:504`. 참고: 8-1과 8-2가 공유하는 키는 `클라이언트`·`보고 대상`(둘 다 project 타입)뿐이라, 실제로 넘어가는 "공통 키"는 project 필드에 직접 입력한 값으로 한정됨(I-3) |
| SC-3 | 프로젝트 정보에서 클라이언트명 수정 → 열린 프롬프트 미리보기 즉시 반영 | ✅ (정적) | `saveProfile()` `app.js:372-380` → `select(state.current.id)` 재렌더 → `resolveValues`. 키 입력 즉시가 아니라 [저장] 시점에 반영(Design §5.4 문구와 일치) |
| SC-4 | 내 프롬프트 생성 → 목록 → 폼 입력 → 복사 → 편집 → 삭제, 새로고침 후 유지 | ✅ (정적, 조건부) | 생성/편집 `app.js:403-432`, 목록 ★ PART `app.js:159-178`, 삭제+confirm `app.js:433-447`, 영속 `pb:custom` `app.js:427`, 로드 `app.js:567`. 조건: 한 줄 입력 칸이 1개뿐인 커스텀 프롬프트에서 Enter를 누르면 페이지가 다시 로드됨(I-1) |
| SC-5 | 기존 45개 중 3개 동일 동작, 콘솔 에러 0 | ✅ (정적) | 신규 속성은 모두 optional이고 type 기본값은 `"text"`(`app.js:234`). `el.*`가 참조하는 DOM id 46개가 `index.html`에 모두 있음. 기존 CSS와 클래스명 충돌 없음(`.text`/`.select`) |

---

## 3. Structural Match (95.2%)

### 3.1 파일 (Design §11.1) — 6/6
| 파일 | 상태 | 근거 |
|------|:----:|------|
| data/parts/part-8.json | ✅ | 신규, 8개 |
| scripts/build-data.py | ✅ | v2 검증 `:12-13, :56-73`, part 범위 1..8 `:49` |
| index.html | ✅ | 헤더 버튼 `:22-27`, 스테퍼 `:52`, 단계 이동 버튼 `:76,78`, dialog 2개 `:89-138` |
| styles.css | ✅ | v2 섹션 `:284-383` (stepper, field 변형, dialog, card-actions, mobile) |
| app.js | ✅ | allPrompts/resolveValues/workflow/profile/custom |
| README.md | ✅ | PART 8·프로젝트 정보·내 프롬프트 안내 `:24-29` |

### 3.2 컴포넌트 (Design §5.3) — 10/10
| 컴포넌트 | 상태 | 근거 |
|----------|:----:|------|
| stepper | ✅ | index.html:52, app.js:197-209, styles.css:300-319 |
| step-nav (copy-bar 내) | ✅ | index.html:76,78, styles.css:320,380 |
| profile-btn / profile-dialog | ✅ | index.html:22-24, 89-108 |
| custom-btn / custom-dialog | ✅ | index.html:25-27, 110-138 |
| field-select (datalist) | ✅ | app.js:242-245 |
| field-project (배지) | ✅ | app.js:251, styles.css:329-334 |
| field-previous | ✅ | app.js:238,240,247,287, styles.css:323-327 |
| card-actions (커스텀만) | ✅ | app.js:170-175, styles.css:337-344 |

### 3.3 localStorage 키 (Design §3.2) — 4/4
| 키 | 상태 | 근거 |
|----|:----:|------|
| `pb:values:<id>` | ✅ | app.js:73 |
| `pb:project` | ✅ | app.js:376, 566 |
| `pb:custom` | ✅ | app.js:427, 437, 473, 567 |
| `pb:theme` | ✅ | app.js:484-487, 568 |

### 3.4 하위 요소 (Design §2.1) — 0/1
| 항목 | 상태 | 근거 |
|------|:----:|------|
| custom-dialog "예시 입력" | ❌ | index.html:110-138에 필드별 예시 입력 UI가 없음. `parseCustomTemplate`가 항상 `example: ""`로 만듦(app.js:392) → I-2 |

---

## 4. Functional Depth (89.7%)

### 4.1 값 해석 규칙 (Design §3.3) — 1/1
| 규칙 | 상태 | 근거 |
|------|:----:|------|
| 사용자 입력 > profile[projectKey] > "" | ✅ | app.js:103-111. 프로필 값은 placeholder가 아니라 실제 값으로 미리보기에 들어감(app.js:307-309). 직접 입력하면 그 프롬프트에서만 덮어씀 |

### 4.2 내부 함수 계약 (Design §4) — 10/10
| 함수 | 상태 | 근거 / 비고 |
|------|:----:|-------------|
| `allPrompts()` | ✅ | app.js:94 — 내장 + 커스텀, part→id(numeric) 정렬 |
| `resolveValues(prompt)` | ✅ | app.js:103 — 실제 시그니처는 `(prompt, values)` (M-8) |
| `compile(prompt, values)` | ✅ | app.js:115-137 — resolve 결과 전달(app.js:308, 340), `[확인 필요: 라벨]` 유지 |
| `workflowSiblings(prompt)` | ✅ | app.js:189-192 — 같은 workflow.id, step 순 |
| `goStep(delta)` | ✅ | app.js:210-228 — ±delta, 비어 있는 키만 carry, `previous` 타입은 carry하지 않음(설계보다 나은 변경, §5.3 참고) |
| `parseCustomTemplate(src)` | ✅ | app.js:384-394 — `[x]`→`{{x}}`, 섹션 라벨 제외(SECTION_LABELS app.js:58), 중복 제거 |
| `saveCustom` | ✅ | app.js:414-432 — upsert, 기존 키의 example/multiline 보존. 인자 대신 DOM에서 읽음(M-8) |
| `deleteCustom(id)` | ✅ | app.js:433-447 — confirm, 값 키 삭제, 열려 있던 상세 닫기 |
| `exportCustom()` | ✅ | app.js:448-456 — Blob JSON 다운로드, 0개면 토스트 |
| `importCustom(json)` | ✅ | app.js:457-479 — 실제로는 File을 받음(M-8). 배열 검사, 허용 속성만 복사, id 충돌 시 재발급, 병합 |

### 4.3 Page UI Checklist (Design §5.4) — 6/6
| 항목 | 상태 | 근거 |
|------|:----:|------|
| 스테퍼 현재·완료 단계 구분 | ✅ | app.js:203, styles.css:317-319 (체크 글리프 없음은 M-1) |
| project 필드 배지 + 자동값 | ✅ | app.js:235-237, 251, 254, 318 |
| 프로필 저장 시 미리보기 즉시 갱신 | ✅ | app.js:378 |
| 커스텀 모달 추출 필드 실시간 표시, 0개 경고 | ✅ | app.js:396-402, 539 |
| 커스텀 카드 편집/삭제, 삭제 confirm | ✅ | app.js:170-175, 435, 491-497 |
| 내보내기(JSON)·가져오기(파일, 병합) | ✅ | app.js:448-479, 542-543 |

### 4.4 에러 처리 (Design §6) — 4.5/5
| 상황 | 상태 | 근거 |
|------|:----:|------|
| 다음 단계 없음 → 버튼 비활성 | ✅ | app.js:207-208 |
| 플레이스홀더 0개 → 저장 허용 + 경고 토스트 | ✅ | app.js:429 |
| 가져오기 형식 오류 → 토스트, 변경 없음 | ✅ | app.js:461-462, 472, 476 (예외는 push 전에만 발생하므로 상태 변경 없음) |
| localStorage 용량 초과 → 토스트, 메모리 유지 | ⚠️ | store.set 토스트 app.js:70. 다만 가져오기 중 용량이 넘치면 바로 뒤 성공 토스트가 에러 토스트를 덮어씀(app.js:473-475), deleteCustom은 반환값을 무시함(app.js:437) → M-2 |
| `<dialog>` 미지원 → open 속성 폴백 | ✅ | app.js:90-91 |

### 4.5 화면 배치 (Design §5.1) — 3.5/4
| 항목 | 상태 | 근거 |
|------|:----:|------|
| 프로필 버튼에 클라이언트명 표시 | ✅ | app.js:362-367, styles.css:293 |
| 스테퍼 완료 단계 "체크 표시" | ⚠️ | 색 변화만 있고 ✓ 글리프는 없음. carry만 돼도 done으로 표시됨(app.js:193-196) → M-1 |
| copy-bar에 이전/다음 단계 버튼 | ✅ | index.html:76-78, app.js:200 |
| previous 필드 최상단 + 강조 박스 + 안내문 | ✅ | app.js:287, styles.css:323-327, part-8.json hint |

### 4.6 기타 기능 점검 — 0.5/3
| 항목 | 상태 | 근거 |
|------|:----:|------|
| custom-dialog 예시 입력 (§2.1) | ❌ | I-2 |
| FR-04 프레임워크 목록 | ⚠️ | part-8.json:45에 Plan §2.1의 "MECE 이슈 트리", "4P"가 없음 → M-5 |
| 폼 입력 안정성 (커스텀) | ⚠️ | `<form id="fields">`(index.html:61)에 submit 핸들러가 없어서, 한 줄 입력이 1개뿐인 폼은 Enter 시 암묵적 submit(GET)으로 페이지가 다시 로드되고 해시가 사라짐 → I-1 |

**합계**: 1 + 10 + 6 + 4.5 + 3.5 + 0.5 = 26 / 29 = 89.7%

---

## 5. Data Contract (94.4%)

서버 API가 없으므로 **Design §3.1 스키마 ↔ build-data.py 검증 ↔ part-8.json 데이터 ↔ app.js 사용**을 서로 대조함.

### 5.1 속성별 대조
| 속성 | Design §3.1 | build-data.py | part-8.json | app.js | 판정 |
|------|:-----------:|:-------------:|:-----------:|:------:|:----:|
| Prompt.tags | ✅ | (검증 없음, optional) | ✅ 8/8 | 검색 app.js:145 | PASS |
| Prompt.workflow {id,step,total,label} | ✅ | id/step/total 검증 :65-73, **label 검증 없음** | ✅ 8-1~8-6 deck 1..6 | id·step·label 사용 app.js:191,204,226 | PARTIAL (M-3) |
| Prompt.custom | ✅ | 해당 없음 | 해당 없음 | app.js:170,267,271,421,567 | PASS |
| Field.type 4종 | ✅ | :12, :58-60 | text/select/project/previous | app.js:234 | PASS |
| Field.options (select) | ✅ | ≥2 :61-62 | 4개 select, 5~10개 옵션 | datalist app.js:242-245 | PASS |
| Field.projectKey | ✅ | 집합 검사 :13, :63-64 | 모두 유효 | resolve app.js:107, 입력칸 app.js:235 | PASS |
| Field.hint | ✅ | (optional) | previous·select에 사용 | app.js:253 | PASS |
| Profile 6키 | ✅ | PROJECT_KEYS :13 | 사용 키 ⊂ 6키 | HTML data-pkey index.html:95-100 | PASS (app.js:60-63 `PROJECT_KEYS` 상수는 쓰이지 않음, M-4) |

### 5.2 빌드 불변 조건 (Design §3.1, §8.1)
| 규칙 | 구현 | 판정 |
|------|------|:----:|
| 플레이스홀더 == fields.key | build-data.py:40-45 | PASS |
| select options ≥ 2 | :61-62 | PASS |
| projectKey ∈ ProjectKey | :63-64 | PASS |
| workflow step 1..total 연속·유일, total 일치 | :69-73 (중복 step은 range 비교로 걸러짐) | PASS |
| part 1..8 | :49 | PASS |
| 섹션 라벨 4종 (FR-08) | :53-55, part-8 8/8 포함 | PASS |

### 5.3 저장·실행 계약
| 항목 | 판정 | 근거 |
|------|:----:|------|
| `pb:custom` = Prompt[] (custom:true, part 99, partTitle "내 프롬프트") | PASS | 저장 app.js:420-424, 로드 시 정규화 app.js:567 |
| compile 출력 계약(base §4: `[확인 필요: 라벨]`, `<mark>`, escape) | PASS | app.js:115-137 |
| Design §8.2-2 테스트 ↔ 데이터 키 | PARTIAL | 테스트는 8-1 "거버닝 메시지" 입력을 전제하지만 8-1에 그런 필드가 없음(part-8.json:15-23) → I-3 |
| Design §2.2 carry 규칙 ↔ 구현 | CHANGED (긍정적) | 설계는 next.fields 전체를 carry하는데, 구현은 `previous` 타입을 제외함(app.js:219). 5개 단계가 같은 키 `이전 단계 AI 결과`를 쓰므로, 제외하지 않으면 1단계 결과가 3단계 previous 칸에 잘못 들어감. 설계 문서를 고쳐야 함 |

**합계**: 18개 중 PARTIAL 2개(각 0.5) → 17 / 18 = 94.4%

---

## 6. Gap 목록

### 🔴 Critical — 없음

### 🟠 Important
| ID | 구분 | 내용 | 위치 | 권장 조치 |
|----|------|------|------|-----------|
| I-1 | 버그 | 상세 폼 `<form id="fields">`에 submit 차단이 없음. 한 줄 입력(text/select)이 정확히 1개인 폼에서 Enter를 누르면 HTML 암묵적 submit이 일어나 페이지가 다시 로드되고 `#id` 해시가 사라짐(입력값은 localStorage에 있어 보존됨). `[주제]`처럼 빈칸 1개짜리 커스텀 프롬프트에서 쉽게 재현됨 | index.html:61, app.js(submit 리스너 없음) | `el.fields.addEventListener("submit", (e) => e.preventDefault());` 추가 |
| I-2 | 누락 | Design §2.1 custom-dialog의 "예시 입력"이 구현되지 않음. 커스텀 필드 example이 항상 빈 값이라 [예시로 채우기]가 아무것도 하지 않고, multiline도 키워드 추정(MULTILINE_HINT)으로만 정해짐 | index.html:125-128, app.js:383, 392 | 추출 필드 칩마다 예시 입력과 multiline 토글을 넣거나, 설계에서 이 항목을 빼기 |
| I-3 | 설계·데이터 불일치 | Design §8.2-2 "8-1 '거버닝 메시지' 입력 → 8-2 같은 키 자동 채움"을 그대로 실행할 수 없음(8-1에 해당 키 없음). 덱 체인에서 단계 사이에 겹치는 키는 project 타입과 `이전 단계 AI 결과`뿐이라, 프로필을 쓰면 "공통 키 carry"가 실질적으로 하는 일이 거의 없음 | design §8.2-2, part-8.json 8-1~8-6 fields | 테스트를 "8-1 클라이언트 직접 입력(프로필 없음) → 8-2 자동 채움"으로 바꾸기. 또는 단계 사이 공통 비-project 키(예: `거버닝 메시지`)를 데이터에 추가하는 방안 검토 |

### 🟡 Minor
| ID | 내용 | 위치 |
|----|------|------|
| M-1 | 스테퍼 완료 단계는 색만 바뀌고 ✓ 표시가 없음(§5.1 "체크 표시"). carry로 값이 들어가기만 해도 done으로 보임 | app.js:193-196, 203; styles.css:317 |
| M-2 | 가져오기 중 용량 초과 시 에러 토스트가 성공 토스트에 덮이고, 메모리에만 추가된 채 남음. deleteCustom은 store.set 결과를 무시함 | app.js:473-475, 437 |
| M-3 | build-data.py가 `workflow.label` 존재를 검증하지 않음(없으면 스테퍼에 "undefined"가 표시됨) | build-data.py:65-67 |
| M-4 | `PROJECT_KEYS` 라벨 상수가 정의만 되고 쓰이지 않음(dead code). 프로필 라벨은 HTML에 하드코딩됨 | app.js:60-63 |
| M-5 | FR-04 프레임워크 목록에서 "MECE 이슈 트리", "4P"가 빠짐. 프레임워크 select가 8-2 하나뿐 | part-8.json:45 |
| M-6 | 프로필이 비어 있을 때도 project 배지 문구가 "프로젝트 정보에서 채워짐"으로 나와 실제 상태와 다름 | app.js:251 |
| M-7 | 공백만 있는 템플릿으로 저장하면 아무 안내 없이 return됨(`required`는 공백을 통과시킴) | app.js:425 |
| M-8 | 함수 시그니처가 설계와 다름: `resolveValues(prompt, values)`, `saveCustom()`(DOM에서 읽음), `importCustom(file)` | app.js:103, 414, 457 |
| M-9 | 스테퍼를 클릭해 이동하면 carry가 일어나지 않음(버튼 이동만 carry). 설계에 명시 없음 | app.js:502 |
| M-10 | [예시로 채우기]나 carry가 project 필드에 예시값을 사용자 입력으로 고정함 → 나중에 프로필을 저장해도 그 프롬프트에는 반영되지 않음 | app.js:514-521, 218-221 |
| M-11 | 프로필 [모두 지우기]는 입력칸만 비우고, [저장]을 눌러야 반영됨 | app.js:536 |

### 🟢 Added (설계에 없음, 구현에 있음)
| 항목 | 위치 |
|------|------|
| ★ PART 하단 "＋ 내 프롬프트 만들기" CTA(검색어가 없을 때 빈 그룹도 표시) | app.js:159, 177 |
| 상세 화면 [편집] 버튼(커스텀만) | index.html:65, app.js:272, 529 |
| SECTION_LABELS에 `참고 자료`, `사용 전 안내` 추가 | app.js:58 |
| 키워드 기반 multiline 자동 판단(MULTILINE_HINT) | app.js:383 |
| 다음 단계 토스트를 previous 필드 유무에 따라 다르게 표시 | app.js:224-227 |

### 🔵 Changed (설계 ≠ 구현)
| 항목 | 설계 | 구현 | 영향 |
|------|------|------|------|
| carry 대상 | next.fields 전체 | `previous` 타입 제외 | 긍정적. 설계 §2.2 업데이트 필요 |
| resolveValues 입력 | `(prompt)` | `(prompt, values)` | 없음. 문서 업데이트 |

---

## 7. 권장 조치

### 즉시 (Important)
1. I-1: `#fields` 폼 submit 차단 한 줄 추가
2. I-2: 커스텀 모달에 필드별 예시·multiline 입력 추가(또는 설계에서 제외)
3. I-3: Design §8.2-2 테스트 문구를 데이터 키에 맞게 수정

### 문서 업데이트
1. Design §2.2: carry 규칙에 "previous 타입 제외" 명시
2. Design §4: 실제 시그니처 반영(resolveValues/saveCustom/importCustom)
3. Design §8: 이 문서는 §8.1~8.3까지만 있음(§8.4 없음). L2/L3는 §8.2·§8.3, 회귀는 base §8.3·§8.4 기준

### 선택 (Minor)
- M-1 ✓ 글리프, M-3 label 검증, M-5 옵션 보강, M-6 배지 문구, M-2 용량 초과 토스트 순서

---

## 8. Runtime Verification Plan (브라우저 수동 체크리스트)

> L1(API)은 해당 없음. `index.html`을 `file://`로 열고, 시작 전 DevTools Console을 열어 둠. 깨끗한 상태에서 시작하려면 `localStorage.clear()` 실행

### 8.0 사전: 데이터 검증 (Design §8.1)
| # | 명령 | 기대 결과 |
|---|------|-----------|
| D-1 | `python scripts/build-data.py` | `prompts: 53`(45 + 8, 8-9 이후가 없을 때), `ok -> ...`, 종료 코드 0 |

### 8.1 L2: UI Action (Design §8.2)
| # | 화면/전제 | 동작 | 기대 결과 |
|---|-----------|------|-----------|
| L2-1 | 프로필 비어 있음 | [프로젝트 정보] → 클라이언트 "테스트사", 보고 대상 "CEO" 입력 → 저장 → 8-1 열기 | 헤더 버튼에 "테스트사"가 표시되고 강조 스타일이 적용됨. 8-1 클라이언트·보고 대상 칸에 배지 "프로젝트 정보 자동 입력"과 점선 테두리가 보이고, 미리보기에 "테스트사"·"CEO"가 `<mark>`로 들어감(8-1 템플릿의 `{{보고 대상}}` 2곳 모두) |
| L2-2 | L2-1 이후 8-1 | 클라이언트 칸에 "직접사" 입력 → [다음 단계 →] | 8-2로 이동, 해시 `#8-2`, 토스트 "2단계예요. 앞 단계 AI 결과를…". `이전 단계 AI 결과` 칸이 폼 맨 위에 강조 박스로 있음. 8-2 클라이언트 칸 값 = "직접사"(carry), 보고 대상 = 프로필 "CEO"(자동) |
| L2-2b | 8-2 | previous 칸에 "AAA" 입력 → [다음 단계 →] → 8-3 | 8-3 previous 칸이 비어 있음(previous는 carry되지 않음). 스테퍼에서 1·2단계가 done 색으로 보임 |
| L2-2c | 8-6 | 스테퍼 6단계 클릭 | [다음 단계 →]가 비활성(disabled), [← 이전 단계]는 활성 |
| L2-3 | 8-2 | "스토리 구조 프레임워크" 칸에 "SCQA" 입력 → datalist에서 "SCQA(상황-복잡성-질문-답)" 선택 | 미리보기 2곳(`{{스토리 구조 프레임워크}}`)에 반영됨. 직접 입력한 임의 문자열도 반영됨 |
| L2-3b | 프로필 저장 상태로 8-1 열어 둠 | [프로젝트 정보]에서 클라이언트를 "변경사"로 바꿔 저장 | 다이얼로그가 닫힌 직후 미리보기 클라이언트 = "변경사"(SC-3). 단, 8-1에서 직접 입력한 칸은 그대로 유지 |
| L2-4 | 목록 | [＋ 내 프롬프트] → 제목 "테스트", 본문 `[역할] 너는 [고객사] 담당이야.\n[요청 사항] [목표]를 정리해줘.` 입력 | 입력하는 동안 칩 "고객사"·"목표"가 표시되고 "2개" 카운트. `[역할]`·`[요청 사항]`은 칩으로 나오지 않음 |
| L2-4b | 이어서 | 저장 | ★ 내 프롬프트 그룹에 카드가 생기고 상세 화면이 열림. "내 프롬프트" 배지, 폼 2칸 |
| L2-4c | 이어서 | 두 칸 입력 → 복사 → 메모장에 붙여 넣기 | `{{`나 `[확인 필요`가 없음 |
| L2-4d | 이어서 | 카드 ✎ → 제목 "테스트2" → 저장 | 목록·상세 제목이 바뀌고 입력값은 유지됨 |
| L2-4e | 이어서 | 새로고침(F5) | 커스텀 카드와 입력값이 그대로 있음 |
| L2-4f | 이어서 | 카드 ✕ → confirm 취소 → 다시 ✕ → 확인 | 취소하면 변화 없음. 확인하면 카드가 사라지고, 열려 있던 상세가 빈 화면으로 바뀌고 해시가 제거됨 |
| L2-4g | 커스텀 모달 | 본문을 `안녕하세요`(대괄호 없음)로 저장 | 경고 칩이 보이고, 저장 후 토스트 "빈칸이 없어서 그대로 복사만 돼요" |
| L2-4h | 커스텀 모달 | 커스텀 2개 생성 → [내보내기] → localStorage에서 `pb:custom` 삭제 후 새로고침 → [가져오기]로 파일 선택 | JSON 파일이 다운로드되고, 가져온 뒤 "2개를 가져왔어요" 토스트와 함께 목록이 복원됨 |
| L2-4i | 커스텀 모달 | 배열이 아닌 JSON(`{}`) 또는 텍스트 파일 가져오기 | 토스트 "가져올 파일 형식이 올바르지 않아요"(에러 스타일), 목록 변화 없음 |
| L2-4j | (I-1 재현) | 본문 `[주제]에 대해 써줘.`로 커스텀 생성 → 주제 칸에서 Enter | **현재 예상: 페이지가 다시 로드되고 해시가 사라짐(버그)**. 수정 후 기대: 아무 일도 일어나지 않음 |
| L2-5 | 회귀 | 1-1, 3-3, 5-3을 각각 열기 → 입력 → 복사 → 새로고침 | 스테퍼·이전/다음 버튼이 숨겨져 있음. 기존처럼 미리보기 치환·`[확인 필요: 라벨]`·복사 토스트·값 복원 동작(base §8.3) |
| L2-6 | 공통 | `/` 키, Ctrl+Enter, 다이얼로그가 열린 상태에서 Ctrl+Enter | 검색 포커스, 복사 동작. 다이얼로그 안에서는 복사되지 않음 |
| L2-7 | 모바일(DevTools 375px) | 8-3 열기 → 스테퍼 가로 스크롤, copy-bar 3버튼, 두 다이얼로그 열기 | 스테퍼가 가로로 스크롤되고 버튼이 잘리지 않음. 다이얼로그가 화면 폭 안에 들어오고 내부 스크롤 가능. 헤더 pill 버튼이 넘치지 않음 |

### 8.2 L3: E2E Scenario (Design §8.3 + base §8.4)
| # | 시나리오 | 단계 | 성공 기준 |
|---|----------|------|-----------|
| L3-1 | 덱 제작 전체 체인 | `localStorage.clear()` → 프로필 6항목 저장 → 8-1 입력 → 복사 → [다음] → 8-2 previous에 더미 결과 붙여 넣기·나머지 입력 → 복사 → … → 8-6 복사 | 복사본 6개 모두 `{{` 없음. 각 복사본에 해당 프롬프트가 쓰는 프로필 값(클라이언트·보고 대상·보고 유형·톤 등)이 들어 있음. 스테퍼 진행 표시가 정상. 콘솔 에러 0 |
| L3-2 | 프로필 우선순위 | L3-1 상태에서 8-4 톤 칸에 "영문" 직접 입력 → 프로필 톤 변경 저장 → 8-4·8-6 비교 | 8-4는 "영문" 유지, 8-6은 새 프로필 톤 반영 |
| L3-3 | 내 프롬프트 생애주기 | 생성 → 목록 → 입력 → 복사 → 편집 → 내보내기 → 삭제 → 가져오기 → 새로고침 | 모든 단계 정상, 새로고침 후 유지(SC-4) |
| L3-4 | 기존 회귀 | 1-1 선택 → 4개 필드 입력 → 복사 | 붙여 넣은 결과에 `{{`·`[확인 필요` 없음(base §8.4) |
| L3-5 | 저장 불가 환경 | 시크릿 창 또는 저장 차단 상태에서 프로필 저장·커스텀 생성 | 토스트 "브라우저 저장 공간이 부족하거나 차단됐어요". 세션 안에서는 메모리 상태로 동작 |

---

## Version History
| 버전 | 날짜 | 변경 |
|------|------|------|
| 0.1 | 2026-10-03 | 최초 갭 분석 (static, Overall 92.7%) |

## Act 기록 (2026-10-03, Iteration 1)

| Gap | 조치 | 결과 |
|-----|------|------|
| I-1 Enter 키로 폼 submit → 페이지 재로드 | `app.js`: `#fields` form에 submit preventDefault 추가 | 브라우저 확인: 단일 입력칸에서 Enter/requestSubmit 후 URL·상세 유지 ✅ |
| I-2 내 프롬프트 모달 "예시 입력" 누락 | 추출된 빈칸마다 예시 입력칸 + "여러 줄" 체크 추가, 저장 시 fields.example/multiline 반영 | 브라우저 확인: 예시가 placeholder로 표시되고 [예시로 채우기] 동작 ✅ |
| I-3 설계 §8.2-2 테스트 전제 불일치 | Design v0.2: carry 규칙에 previous 제외 명시, 테스트를 "클라이언트 칸 직접 입력 → 다음 단계 전달"로 정정 | 문서 수정 ✅ |

브라우저 재검증(L2): 8-9~8-11 신규 프롬프트 렌더·플레이스홀더 치환 확인, 콘솔 에러 0.
