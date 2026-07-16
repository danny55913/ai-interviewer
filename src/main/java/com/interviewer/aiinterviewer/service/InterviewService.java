package com.interviewer.aiinterviewer.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.InMemoryChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.stereotype.Service;

@Service
public class InterviewService {

    private final ChatClient chatClient;

    public InterviewService(ChatClient.Builder chatClientBuilder) {
        // 1. InMemoryChatMemoryRepository를 주입하여
        // 2. 최대 10개의 최근 대화 메시지 윈도우를 유지하는 MessageWindowChatMemory를 생성합니다.
        MessageWindowChatMemory chatMemory = MessageWindowChatMemory.builder()
                .chatMemoryRepository(new InMemoryChatMemoryRepository())
                .maxMessages(10)
                .build();

        this.chatClient = chatClientBuilder
                .defaultSystem("""
                    너는 대기업 IT 서비스 기업의 숙련된 시니어 백엔드 개발자이자 기술 면접관이야.
                    
                    지원자가 너의 질문에 답변을 하면, 다음 원칙에 따라 면접을 진행해줘:
                    1. 지원자의 답변을 가볍게 평가하고 격려해주되, 보완할 점이 있다면 핵심적인 기술 키워드를 짚어줘.
                    2. 지원자의 답변 내용에서 더 깊게 들어가야 할 부분(예: 예외 처리, 동시성 이슈, 성능 최적화 등)에 대해 날카로운 꼬리 질문을 1개 던져줘.
                    3. 한 번에 너무 많은 질문을 하지 말고, 무조건 한 번에 1개의 질문만 던져서 대화를 유도해줘.
                    4. 전문적이면서도 정중한 톤앤매너를 유지해줘.
                    """)
                // 3. 빌더 패턴을 이용하여 어드바이저에 탑재합니다.
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .build();
    }

    /**
     * 면접자의 대답을 받아 AI 면접관의 답변(평가 + 꼬리 질문)을 반환합니다.
     * @param sessionId 면접 세션 ID (사용자별로 대화 흐름을 구분하는 고유 키)
     * @param userMessage 지원자의 답변
     */
    public String chat(String sessionId, String userMessage) {
        return this.chatClient.prompt()
                .user(userMessage)
                // ChatMemory가 이 sessionId를 기준으로 대화를 추적하고 기억합니다.
                .advisors(spec -> spec.param("chat_memory_conversation_id", sessionId))
                .call()
                .content();
    }
}