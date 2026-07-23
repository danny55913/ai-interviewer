================================================================================
                    🤖 AI 모의 기술 면접 서비스 (Interview Assistant)
================================================================================

1. 📌 프로젝트 개요
--------------------------------------------------------------------------------
본 프로젝트는 한성대학교 프로젝트 경험 및 실무 기술을 바탕으로 Spring Boot(Spring AI)와
React를 연동하여 개발된 "AI 기반 모의 기술 면접 및 복기 서비스"입니다.

사용자가 지원 직무(Java Backend, React, AI/ML 등)와 경력 수준(신입, 경력)을 선택하면,
AI 면접관 페르소나가 생성되어 실시간 기술 면접 질문을 던집니다.
답변 제한시간(60초) 제어, 대화 내역 기반 AI 종합 평가 리포트 자동 생성/DB 저장,
그리고 과거 면접을 복기할 수 있는 대시보드 UI를 제공합니다.


2. 🛠️ 기술 스택 (Tech Stack)
--------------------------------------------------------------------------------
[Backend]
- Java 17 / Spring Boot 3.x
- Spring AI (OpenAI ChatClient & MessageChatMemoryAdvisor)
- Spring Data JPA
- H2 Database (In-Memory)

[Frontend]
- React (Vite / CRA)
- Axios (HTTP Client)
- CSS3 (BEM Pattern / Responsive Design)

[DevOps & Tools]
- Git / GitHub (Feature Branch Strategy)
- IntelliJ IDEA / VS Code


3. 📅 날짜별 개발 및 고도화 작업 일지 (Timeline)
--------------------------------------------------------------------------------

■ 2026-07-15 : 프로젝트 기획, 요구사항 정의 및 개발 환경 구축
  - AI 모의 면접 서비스의 핵심 기능 및 유저 시나리오 정의
  - Spring Boot 3.x 프로젝트 생성 및 Spring AI 관련 패키지 의존성(Dependency) 설정
  - React 프론트엔드 기본 프로젝트 구성 및 Axios 통신 기반 마련

■ 2026-07-17 : 백엔드 AI 면접 세션 및 프롬프트 엔지니어링 설계
  - Spring AI `ChatClient` 기반 면접 세션 생성 logic 구축 (`/api/interview/start`)
  - 직무 및 경력 수준에 따른 맞춤형 프롬프트 엔지니어링 설계 (시니어 개발자 면접관 페르소나 부여)
  - 대화 주고받기 API (`/api/interview/chat`) 구현 및 메모리 기반 세션 상태 관리 구현

■ 2026-07-19 : 프론트엔드 채팅 UI 구축 및 60초 제한시간 타이머 제어
  - React 프론트엔드 기본 채팅 UI 구현 및 Axios 통신 연결
  - 면접 시작 시 고유 세션 ID (UUID) 자동 생성 로직 적용
  - React `useRef` 및 `setInterval`을 활용한 60초 답변 제한시간 타이머 구현
  - 10초 이하 남았을 때 시각적 경고(빨간색 표시) 및 타임아웃 발생 시 자동으로 AI에게
    "답변 미작성" 상태를 전달하여 다음 질문을 유도하는 예외 처리 구현
  - `scrollIntoView`를 활용한 실시간 대화 스크롤 자동 하단 이동 적용

■ 2026-07-21 : AI 종합 피드백 리포트 연동 및 DB 저장 로직 개발
  - JPA Entity (`InterviewResult`) 및 Repository (`InterviewResultRepository`) 구현
  - 전체 대화 내역 기반 AI 종합 평가 리포트(점수, 강점, 보완할 기술 개념, 총평) 생성 로직 구현
  - 면접 종료 시 평가 결과를 H2 DB에 안전하게 저장하는 API (`/api/interview/save`) 구현

■ 2026-07-22 : Advisor 오류 트러블슈팅 및 조회 API 개발
  - [트러블 슈팅] Spring AI `MessageChatMemoryAdvisor` 사용 시 피드백 생성 과정에서
    발생하던 `java.lang.IllegalArgumentException: conversationId cannot be null` 예외 해결
    -> 피드백 호출 시 `.advisors(spec -> spec.param("chat_memory_conversation_id", sessionId))`
       파라미터를 명시적으로 전달하도록 수정하여 해결
  - 전체 면접 기록 최신순 조회 (`/api/interview/history`) 및 상세 조회 API 개발

■ 2026-07-23 : 마이페이지/대시보드 UI 완성 및 프로젝트 통합 (Final)
  - React 상단 Header Tab Navigation 구축 (`[🎙️ 모의 면접]` / `[📝 내 면접 기록]`)
  - 면접 종료 및 저장 성공 시 자동으로 내 면접 기록 탭으로 이동하는 UX 개선
  - 과거 면접 목록 카드 뷰 Grid 레이아웃 구성
  - 기록 카드 클릭 시 전체 대화 전문 복기 및 AI 총평 리포트를 한눈에 볼 수 있는 상세 모달(Modal) UI 구현
  - `feature/interview-history-dashboard` 브랜치 작업 완료 후 `main` 브랜치 병합 및 푸시 완료


4. ✨ 주요 기능 상세
--------------------------------------------------------------------------------
1) 맞춤형 AI 모의 면접 세션
   - 지원 직무(Java Backend, React, AI/ML, DevOps 등) 및 연차 선택
   - 설정된 조건에 맞추어 시니어 면접관 페르소나 설정 및 모의 면접 시작

2) 60초 실시간 제한시간 제어
   - 질문 수신 시 60초 타이머 실시간 작동
   - 타임아웃 발생 시 답변 기회 박탈 및 AI 면접관의 지적 후 다음 질문으로 자동 전환

3) AI 종합 평가 리포트 자동 생성 및 JPA 저장
   - 면접 종료 버튼 클릭 시 진행된 전체 대화 텍스트 자동 취합
   - AI가 전체 맥락을 분석하여 종합 평가서 작성 및 H2 데이터베이스에 저장

4) 내 면접 기록 보기 (대시보드 & 복기 모달)
   - 과거 면접 목록을 일자별/직무별 카드로 최신순 조회
   - 카드 클릭 시 모달 팝업을 통해 전체 대화 내역 복기 및 AI 리포트 상세 확인


5. 🚀 실행 방법 (How to Run)
--------------------------------------------------------------------------------
[Backend]
1. `application.yml` 파일 내 OpenAI API Key 설정
2. `AiInterviewerApplication.java` 실행 (8080 포트)

[Frontend]
1. `npm install` (axios 등 필수 패키지 설치)
2. `npm start` 실행 (3000 포트)
3. 브라우저에서 `http://localhost:3000` 접속
================================================================================