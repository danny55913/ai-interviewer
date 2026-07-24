package com.interviewer.aiinterviewer.service;

import com.interviewer.aiinterviewer.controller.dto.InterviewSaveRequest;
import com.interviewer.aiinterviewer.domain.InterviewResult;
import com.interviewer.aiinterviewer.entity.User; // ⭐️ User 엔티티 추가
import com.interviewer.aiinterviewer.exception.SessionNotFoundException;
import com.interviewer.aiinterviewer.repository.InterviewResultRepository;
import com.interviewer.aiinterviewer.repository.UserRepository; // ⭐️ UserRepository 추가
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.InMemoryChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class InterviewService {

    private static final Logger log = LoggerFactory.getLogger(InterviewService.class);

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;
    private final InterviewResultRepository interviewResultRepository;
    private final UserRepository userRepository; // ⭐️ 추가

    public InterviewService(ChatClient.Builder chatClientBuilder,
                            InterviewResultRepository interviewResultRepository,
                            UserRepository userRepository) { // ⭐️ UserRepository 주입 추가
        this.chatMemory = MessageWindowChatMemory.builder()
                .chatMemoryRepository(new InMemoryChatMemoryRepository())
                .maxMessages(20)
                .build();

        this.chatClient = chatClientBuilder
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(this.chatMemory).build())
                .build();

        this.interviewResultRepository = interviewResultRepository;
        this.userRepository = userRepository; // ⭐️ 추가
    }

    /**
     * 1. 일반 면접 시작 (기존 유지)
     */
    public void initInterview(String sessionId, String jobCategory, String experienceLevel) {
        chatMemory.clear(sessionId);

        String dynamicSystemPrompt = String.format("""
            당신은 대기업 IT 서비스 기업의 시니어 개발자이며, [%s] 직무 [%s] 채용을 담당하는 면접관입니다.
            
            [답변 규칙]
            1. 면접관으로서 실제 면접처럼 짧고 명확하게 핵심만 말하세요. (최대 2~3문장 내외)
            2. 지원자의 답변에 대해 간단히 공감이나 피드백을 1문장으로 남기고, 바로 다음 질문 1개만 던지세요.
            3. 절대로 '신입 채용 시...', '더 자세한 설명을 통해...' 같은 가이드라인, 덧붙임 말, 볼드체 목록, 질문 가이드를 포함하지 마세요.
            4. 오직 실제 지원자에게 건네는 말만 자연스러운 대화체로 답변하세요.
            """, jobCategory, experienceLevel);

        chatMemory.add(sessionId, List.of(new SystemMessage(dynamicSystemPrompt)));
    }

    /**
     * ⭐️ [신규/수정] 이력서 기반 면접 세션 초기화 및 첫 질문 생성 (기존 유지)
     */
    public String startInterviewWithResume(String sessionId, String jobCategory, String experienceLevel, String resumeText) {
        chatMemory.clear(sessionId);

        StringBuilder systemPrompt = new StringBuilder();
        systemPrompt.append(String.format("""
            당신은 대기업 IT 서비스 기업의 시니어 개발자이며, [%s] 직무 [%s] 채용을 담당하는 면접관입니다.
            
            [답변 규칙]
            1. 면접관으로서 실제 면접처럼 짧고 명확하게 핵심만 말하세요. (최대 2~3문장 내외)
            2. 절대로 가이드라인, 볼드체 목록, 질문 팁 등을 덧붙이지 말고 자연스러운 대화체로 말하세요.
            3. 매번 질문은 오직 1개만 던지세요.
            """, jobCategory, experienceLevel));

        if (resumeText != null && !resumeText.trim().isEmpty()) {
            systemPrompt.append("\n=== 지원자 제출 이력서/포트폴리오 내용 ===\n")
                    .append(resumeText).append("\n")
                    .append("=========================================\n")
                    .append("위 이력서에 작성된 프로젝트 경험, 사용 기술 스택, 주요 성과 또는 트러블슈팅 내역을 바탕으로 기술 면접을 진행해 주세요.\n");
        }

        chatMemory.add(sessionId, List.of(new SystemMessage(systemPrompt.toString())));

        String initialPrompt = (resumeText != null && !resumeText.trim().isEmpty())
                ? "제출된 이력서 내용을 바탕으로 가장 검증하고 싶거나 궁금한 부분에 대해 첫 번째 질문을 던져주세요."
                : "안녕하세요. 간단한 인사와 함께 첫 질문을 던져주세요.";

        return this.chatClient.prompt()
                .user(initialPrompt)
                .advisors(spec -> spec.param("chat_memory_conversation_id", sessionId))
                .call()
                .content();
    }

    public String chat(String sessionId, String userMessage) {
        if (chatMemory.get(sessionId) == null || chatMemory.get(sessionId).isEmpty()) {
            throw new SessionNotFoundException("유효하지 않은 면접 세션입니다. 먼저 면접을 시작해주세요.");
        }

        return this.chatClient.prompt()
                .user(userMessage)
                .advisors(spec -> spec.param("chat_memory_conversation_id", sessionId))
                .call()
                .content();
    }

    /**
     * 2. 면접 종료 후 종합 피드백 리포트 생성 및 저장 (기존 유지)
     */
    public InterviewResult saveResult(InterviewSaveRequest request) {

        String feedbackPrompt = String.format("""
            당신은 IT 기술 면접관입니다. 아래 진행된 모의 면접 대화 내역을 바탕으로 지원자에 대한 종합 평가 리포트를 작성해 주세요.
            
            [면접 정보]
            - 직무: %s
            - 연차: %s
            
            [대화 내역]
            %s
            
            [작성 양식]
            아래 양식을 엄격히 지켜서 간결하게 피드백을 작성해 주세요:
            1. 점수 (기술 이해도: OO점, 논리성: OO점, 총점: OO점)
            2. 잘한 점 (강점 2가지)
            3. 아쉬운 점 및 보완할 부분 (2가지)
            4. 추천 공부 키워드 (3~4개)
            """,
                request.jobCategory(),
                request.experienceLevel(),
                request.fullChatHistory()
        );

        String aiFeedbackResult;
        try {
            aiFeedbackResult = chatClient.prompt()
                    .user(feedbackPrompt)
                    .advisors(spec -> spec.param("chat_memory_conversation_id", request.sessionId()))
                    .call()
                    .content();
        } catch (Exception e) {
            log.error("AI 피드백 생성 중 오류 발생: ", e);
            aiFeedbackResult = "AI 피드백 생성 중 오류가 발생했습니다. (사유: " + e.getMessage() + ")";
        }

        InterviewResult result = InterviewResult.builder()
                .sessionId(request.sessionId())
                .jobCategory(request.jobCategory())
                .experienceLevel(request.experienceLevel())
                .fullChatHistory(request.fullChatHistory())
                .aiFeedback(aiFeedbackResult)
                .createdAt(LocalDateTime.now())
                .build();

        return interviewResultRepository.save(result);
    }

    /**
     * ⭐️ [신규 추가] 로그인한 유저 정보를 포함하여 면접 결과 저장
     */
    public InterviewResult saveResultWithUser(InterviewSaveRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));

        // 기존 AI 피드백 생성 로직 동일하게 수행
        String feedbackPrompt = String.format("""
            당신은 IT 기술 면접관입니다. 아래 진행된 모의 면접 대화 내역을 바탕으로 지원자에 대한 종합 평가 리포트를 작성해 주세요.
            
            [면접 정보]
            - 직무: %s
            - 연차: %s
            
            [대화 내역]
            %s
            
            [작성 양식]
            아래 양식을 엄격히 지켜서 간결하게 피드백을 작성해 주세요:
            1. 점수 (기술 이해도: OO점, 논리성: OO점, 총점: OO점)
            2. 잘한 점 (강점 2가지)
            3. 아쉬운 점 및 보완할 부분 (2가지)
            4. 추천 공부 키워드 (3~4개)
            """,
                request.jobCategory(),
                request.experienceLevel(),
                request.fullChatHistory()
        );

        String aiFeedbackResult;
        try {
            aiFeedbackResult = chatClient.prompt()
                    .user(feedbackPrompt)
                    .advisors(spec -> spec.param("chat_memory_conversation_id", request.sessionId()))
                    .call()
                    .content();
        } catch (Exception e) {
            log.error("AI 피드백 생성 중 오류 발생: ", e);
            aiFeedbackResult = "AI 피드백 생성 중 오류가 발생했습니다. (사유: " + e.getMessage() + ")";
        }

        // user 필드를 포함하여 빌드
        InterviewResult result = InterviewResult.builder()
                .sessionId(request.sessionId())
                .jobCategory(request.jobCategory())
                .experienceLevel(request.experienceLevel())
                .fullChatHistory(request.fullChatHistory())
                .aiFeedback(aiFeedbackResult)
                .user(user) // ⭐️ 로그인한 사용자 연동
                .createdAt(LocalDateTime.now())
                .build();

        return interviewResultRepository.save(result);
    }

    public List<InterviewResult> getAllInterviewHistory() {
        return interviewResultRepository.findAllByOrderByCreatedAtDesc();
    }

    /**
     * ⭐️ [신규 추가] 로그인한 사용자의 면접 기록만 최신순 조회
     */
    public List<InterviewResult> getMyInterviewHistory(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다: " + username));

        return interviewResultRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
    }

    public InterviewResult getInterviewDetail(String sessionId) {
        return interviewResultRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new SessionNotFoundException("해당 세션의 면접 기록을 찾을 수 없습니다: " + sessionId));
    }
}