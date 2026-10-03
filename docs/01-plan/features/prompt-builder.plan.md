# prompt-builder Planning Document

> **Feature**: prompt-builder (직장인을 위한 AI 프롬프트 45 — 웹 프롬프트 완성기)
> **Level**: Starter (정적 웹, 백엔드 없음)
> **Author**: Claude Fable 5.1 · **Date**: 2026-10-03 · **Status**: Draft

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | PDF 「직장인을 위한 AI 프롬프트 45」의 프롬프트는 `[빈칸]`을 직접 찾아 손으로 바꿔야 해서, 매번 복사·편집·누락 확인에 시간이 든다. |
| **Solution** | 45개 프롬프트를 데이터화하고, 상황을 고르면 "이것만 준비하세요" 항목이 입력 폼으로 나타나며, 입력 즉시 완성 프롬프트가 실시간으로 조립되는 단일 페이지 웹앱을 만든다. |
| **Function UX Effect** | 상황 검색 → 폼 입력 → [복사] 한 번으로 ChatGPT·Claude·Gemini에 바로 붙여 넣을 수 있다. 빈 칸은 자동으로 `[확인 필요]`로 채워져 누락이 보인다. |
| **Core Value** | 프롬프트 활용 진입 장벽 제거. 설치·로그인·서버 없이 브라우저 하나로 동작하고, 입력값은 브라우저에만 저장된다. |

## Context Anchor

| 항목 | 내용 |
|------|------|
| **WHY** | PDF 프롬프트를 쓸 때마다 빈칸 치환 작업이 반복되고 누락이 생김 |
| **WHO** | PDF를 가진 직장인 사용자(본인). 비개발자, 모바일·데스크톱 브라우저 |
| **RISK** | PDF 텍스트 추출 오류로 프롬프트 원문이 왜곡될 가능성; 플레이스홀더↔입력 필드 불일치 |
| **SUCCESS** | 45개 프롬프트 모두 폼으로 완성·복사 가능, 플레이스홀더 100% 치환, 클립보드 복사 성공 |
| **SCOPE** | 정적 HTML/CSS/JS 1페이지 + JSON 데이터. 로그인·서버·AI 호출 없음 |

## 1. Overview

### 1.1 Purpose
PDF에 수록된 45개 업무 프롬프트를 웹에서 즉시 완성하고 복사할 수 있게 한다.

### 1.2 Background
PDF 사용법: (1) 상황 찾기 → (2) "이것만 준비하세요" 정보 준비 → (3) `[ ]` 안을 내 상황으로 교체 → (4) 복사해 AI에 붙이기. 이 흐름을 그대로 웹 UI로 옮긴다.
PDF 구조(분석 결과): 7개 PART, 45개 프롬프트(각 1페이지). 각 페이지는 제목(상황), 소분류, "이렇게 달라져요", "이것만 준비하세요"(입력 항목 + 예시), 프롬프트 본문([역할]/[업무 배경]/[요청 사항]/[출력 형식] + `[플레이스홀더]`), 일부 `[사용 전 안내]`, 퍼블리 아티클 제목으로 구성된다.

### 1.3 Related Documents
- 원본: `C:\Users\24jos\Downloads\직장인을 위한 프롬프트.pdf` (62p)
- Design: `docs/02-design/features/prompt-builder.design.md`

## 2. Scope

### 2.1 In Scope
- 45개 프롬프트 데이터(JSON) 추출 및 검증
- PART/소분류별 목록 + 키워드 검색
- 프롬프트별 입력 폼(라벨, 예시 placeholder, 멀티라인 지원)
- 실시간 프롬프트 미리보기(치환된 부분 강조)
- 클립보드 복사 버튼(성공 피드백), 빈 입력은 `[확인 필요]`로 치환
- 입력값 브라우저 로컬 저장(localStorage) 및 초기화
- "이렇게 달라져요", "사용 전 안내", 관련 아티클 제목 표시
- 모바일 반응형, 다크 모드

### 2.2 Out of Scope
- AI API 직접 호출, 로그인/계정, 서버/DB
- 사용자 정의 프롬프트 추가·편집(후속 과제)
- PDF 부록(AI 도구 60, 무료 AI 20)

## 3. Requirements

### 3.1 Functional Requirements
| ID | 요구사항 | 우선순위 |
|----|----------|:--:|
| FR-01 | 45개 프롬프트를 PART별로 목록 표시하고 제목·소분류·키워드로 검색 | P0 |
| FR-02 | 프롬프트 선택 시 플레이스홀더 수만큼 입력 필드를 생성(라벨=준비 항목, placeholder=예시) | P0 |
| FR-03 | 입력 즉시 템플릿의 `{{키}}`가 치환된 완성 프롬프트를 미리보기로 표시 | P0 |
| FR-04 | [복사] 클릭 시 완성 프롬프트를 클립보드에 복사하고 "복사됨" 피드백 표시 | P0 |
| FR-05 | 비어 있는 필드는 `[확인 필요: 라벨]`로 치환되고 미리보기에서 시각적으로 구분 | P1 |
| FR-06 | 입력값을 프롬프트별로 localStorage에 저장·복원, [초기화] 제공 | P1 |
| FR-07 | 상황 설명 보조정보(이렇게 달라져요 / 사용 전 안내 / 아티클) 표시 | P1 |
| FR-08 | URL 해시(`#1-1`)로 특정 프롬프트 직접 접근 | P2 |
| FR-09 | 예시 값 한 번에 채우기(데모) | P2 |

### 3.2 Non-Functional Requirements
- 빌드 도구·서버 불필요: `index.html`을 더블클릭하거나 어떤 정적 호스팅에 올려도 동작
- 외부 네트워크 의존 없음(폰트 포함 선택적), 첫 로드 < 1초
- 모바일(375px)~데스크톱 반응형, 라이트/다크 자동
- 한국어 UI

## 4. Success Criteria

### 4.1 Definition of Done
- [ ] `data/prompts.json`에 45개 항목, 모든 `{{키}}`가 fields.key와 1:1 일치(스크립트 검증)
- [ ] 45개 중 임의 5개를 PDF 원문과 대조해 본문 누락·오타 없음
- [ ] 폼 입력 → 미리보기 반영 → 복사 → 메모장에 붙이기 동작 확인(브라우저 실측)
- [ ] 새로고침 후 입력값 복원 확인
- [ ] 모바일 폭에서 가로 스크롤 없음

### 4.2 Quality Criteria
- 콘솔 에러 0, `file://`로 열어도 동작(데이터를 JS로 인라인)

## 5. Risks and Mitigation
| 리스크 | 영향 | 대응 |
|--------|------|------|
| PDF 텍스트 추출 순서 뒤섞임·탭 분절 | 프롬프트 원문 왜곡 | 에이전트가 원본 PDF 페이지를 Read로 대조, 스키마 검증 스크립트 실행 |
| 플레이스홀더 표기 불일치(같은 의미 다른 표기) | 필드 누락 | 템플릿 `{{}}` 집합 == fields.key 집합 자동 검증 |
| `file://`에서 fetch 차단 | 데이터 로드 실패 | 데이터를 `data/prompts.js`(전역 변수)로 제공 |
| 클립보드 API 미지원(비HTTPS) | 복사 실패 | `execCommand('copy')` 폴백 + 수동 선택 안내 |

## 6. Impact Analysis
신규 프로젝트. 기존 소비자 없음.

## 7. Architecture Considerations

### 7.1 Project Level Selection
**Starter** — 정적 웹. 백엔드·인증 불필요.

### 7.2 Key Architectural Decisions
- 프레임워크 없이 Vanilla HTML/CSS/JS (의존성 0, 유지보수 단순)
- 데이터와 UI 분리: `data/prompts.js`(콘텐츠) ↔ `app.js`(동작)
- 템플릿 문법: `{{키}}` 단일 치환, 로직 없음

## 8. Convention Prerequisites
- 파일: kebab-case, UTF-8, 2-space indent
- JS: ES2020, 모듈 없이 단일 IIFE, `const` 우선
- CSS: 커스텀 프로퍼티(`--bg`, `--fg`, `--accent` …)로 테마

## 9. Next Steps
1. `/pdca design prompt-builder` → UI 구조·데이터 모델 확정
2. 데이터 추출(병렬) + 구현
3. `/pdca analyze prompt-builder`

## Version History
| 버전 | 날짜 | 변경 |
|------|------|------|
| 0.1 | 2026-10-03 | 초안 |
