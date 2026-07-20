package com.interviewer.aiinterviewer.service;

import com.interviewer.aiinterviewer.controller.dto.InterviewSaveRequest;
import com.interviewer.aiinterviewer.domain.InterviewResult;
import com.interviewer.aiinterviewer.exception.SessionNotFoundException;
import com.interviewer.aiinterviewer.repository.InterviewResultRepository;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.InMemoryChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class InterviewService {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;
    private final InterviewResultRepository interviewResultRepository;

    // ⭐️ 변경 후 정답 코드
    public InterviewService(ChatClient.Builder chatClientBuilder, InterviewResultRepository interviewResultRepository) {
        // 1. 공용 메모리 저장소 생성 (기존과 동일)
        this.chatMemory = MessageWindowChatMemory.builder()
                .chatMemoryRepository(new InMemoryChatMemoryRepository())
                .maxMessages(20)
                .build();

        // 2. 빌더 패턴을 사용하여 Advisor 주입 (이 부분을 수정!)
        this.chatClient = chatClientBuilder
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(this.chatMemory).build())
                .build();

        this.interviewResultRepository = interviewResultRepository;
    }

    public void initInterview(String sessionId, String jobCategory, String experienceLevel) {
        chatMemory.clear(sessionId);

        String dynamicSystemPrompt = String.format("""
            너는 대기업 IT 서비스 기업의 숙련된 시니어 개발자이자, [%s] 직무의 [%s] 채용을 담당하는 날카로운 기술 면접관이야.
            ... (기존 프롬프트 내용 동일) ...
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
     * ⭐️ 면접 결과를 DB에 실제로 저장하는 로직
     */
    public void saveResult(InterviewSaveRequest request) {
        // 엔티티에 정의된 생성자 순서대로 DTO의 값을 꺼내어 쏙 넣어줍니다.
        // 순서: sessionId, jobCategory, experienceLevel, fullChatHistory, aiFeedback, durationSeconds
        InterviewResult result = new InterviewResult(
                request.sessionId(),
                request.jobCategory(),
                request.experienceLevel(),
                request.fullChatHistory(),
                request.aiFeedback(),
                0 // durationSeconds (현재 프론트에서 안 넘어오므로 임시 기본값 0 처리)
        );

        // 생성된 엔티티 객체를 리포지토리를 통해 영속화(DB 저장)합니다.
        interviewResultRepository.save(result);
    }
}