package com.interviewer.aiinterviewer.controller;

import com.interviewer.aiinterviewer.service.InterviewService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/interview")
public class InterviewController {

    private final InterviewService interviewService;

    public InterviewController(InterviewService interviewService) {
        this.interviewService = interviewService;
    }

    /**
     * AI 면접관과의 대화 API
     * @param sessionId 대화 흐름을 유지하기 위한 세션 ID (예: user1, test-session 등 임의의 값 가능)
     * @param message 면접자의 답변
     */
    @GetMapping("/chat")
    public String chat(
            @RequestParam(value = "sessionId", defaultValue = "default-session") String sessionId,
            @RequestParam(value = "message") String message) {
        return interviewService.chat(sessionId, message);
    }
}