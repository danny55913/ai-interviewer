package com.interviewer.aiinterviewer.service;

import com.interviewer.aiinterviewer.exception.SessionNotFoundException;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.memory.InMemoryChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class InterviewService {

    private final ChatClient chatClient;
    private final MessageWindowChatMemory chatMemory;

    public InterviewService(ChatClient.Builder chatClientBuilder) {
        // ChatMemory 객체를 멤버 변수로 빼서 동적 제어가 가능하도록 합니다.
        this.chatMemory = MessageWindowChatMemory.builder()
                .chatMemoryRepository(new InMemoryChatMemoryRepository())
                .maxMessages(10)
                .build();

        // defaultSystem을 제거하고, 대화 기억(Advisor)만 기본 탑재합니다.
        this.chatClient = chatClientBuilder
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(this.chatMemory).build())
                .build();
    }

    /**
     * 면접 시작 시 호출되어 사용자가 선택한 분야와 연차에 맞춰 페르소나를 동적으로 주입합니다.
     */
    public void initInterview(String sessionId, String jobCategory, String experienceLevel) {
        // 기존 세션 정보가 있다면 초기화
        chatMemory.clear(sessionId);

        // 동적으로 변형되는 시스템 프롬프트 생성
        String dynamicSystemPrompt = String.format("""
            너는 대기업 IT 서비스 기업의 숙련된 시니어 개발자이자, [%s] 직무의 [%s] 채용을 담당하는 날카로운 기술 면접관이야.
            
            지원자가 너의 질문에 답변을 하면, 다음 원칙에 따라 면접을 진행해줘:
            1. [%s] 기술 스택 및 [%s] 수준에 맞는 적절하고 전문적인 질문을 던져줘.
            2. 지원자의 답변을 가볍게 평가하고 격려해주되, 보완할 점이 있다면 핵심적인 기술 키워드를 짚어줘.
            3. 지원자의 답변 내용에서 더 깊게 들어가야 할 부분(예: 예외 처리, 동시성 이슈, 성능 최적화, 아키텍처 등)에 대해 날카로운 꼬리 질문을 1개 던져줘.
            4. 무조건 한 번에 1개의 질문만 던져서 실제 면접처럼 대화를 유도해줘.
            5. 전문적이면서도 정중한 톤앤매너를 유지해줘.
            """, jobCategory, experienceLevel, jobCategory, experienceLevel);

        // 생성된 프롬프트를 이 세션의 대화 기억 첫머리에 시스템 메시지로 강제 주입합니다.
        chatMemory.add(sessionId, List.of(new SystemMessage(dynamicSystemPrompt)));
    }

    /**
     * 대화 진행 (세션 검증 로직 추가)
     */
    public String chat(String sessionId, String userMessage) {
        // [검증 추가] 메모리에 해당 세션의 대화 내역(혹은 시스템 프롬프트)이 아예 없는 경우 예외를 던집니다.
        if (chatMemory.get(sessionId) == null || chatMemory.get(sessionId).isEmpty()) {
            throw new SessionNotFoundException("유효하지 않은 면접 세션입니다. 먼저 면접을 시작해주세요.");
        }

        return this.chatClient.prompt()
                .user(userMessage)
                .advisors(spec -> spec.param("chat_memory_conversation_id", sessionId))
                .call()
                .content();
    }
}