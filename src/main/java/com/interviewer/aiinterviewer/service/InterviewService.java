package com.interviewer.aiinterviewer.service;

import com.interviewer.aiinterviewer.controller.dto.InterviewSaveRequest;
import com.interviewer.aiinterviewer.domain.InterviewResult;
import com.interviewer.aiinterviewer.exception.SessionNotFoundException;
import com.interviewer.aiinterviewer.repository.InterviewResultRepository;
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

    public InterviewService(ChatClient.Builder chatClientBuilder, InterviewResultRepository interviewResultRepository) {
        this.chatMemory = MessageWindowChatMemory.builder()
                .chatMemoryRepository(new InMemoryChatMemoryRepository())
                .maxMessages(20)
                .build();

        this.chatClient = chatClientBuilder
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(this.chatMemory).build())
                .build();

        this.interviewResultRepository = interviewResultRepository;
    }

    /**
     * 1. 면접 시작 시 프롬프트 설정 (답변 길이를 대폭 줄이고 면접관처럼 핵심만 말하도록 제약)
     */
    public void initInterview(String sessionId, String jobCategory, String experienceLevel) {
        chatMemory.clear(sessionId);

        // ⭐️ 답변을 짧고 명확하게 제어하기 위한 제약 조건 강화
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
     * 2. 면접 종료 후 종합 피드백 리포트 생성 및 저장
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

        // 2. AI에게 피드백 생성 요청
        String aiFeedbackResult;
        try {
            aiFeedbackResult = chatClient.prompt()
                    .user(feedbackPrompt)
                    // ⭐️ 핵심 해결법: sessionId를 conversation_id로 전달해 줍니다!
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
     * 3. 전체 면접 기록 목록 최신순 조회
     */
    public List<InterviewResult> getAllInterviewHistory() {
        return interviewResultRepository.findAllByOrderByCreatedAtDesc();
    }

    /**
     * 4. 특정 세션 ID의 면접 상세 기록 조회
     */
    public InterviewResult getInterviewDetail(String sessionId) {
        return interviewResultRepository.findBySessionId(sessionId)
                .orElseThrow(() -> new SessionNotFoundException("해당 세션의 면접 기록을 찾을 수 없습니다: " + sessionId));
    }
}