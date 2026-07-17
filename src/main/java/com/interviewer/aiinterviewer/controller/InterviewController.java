package com.interviewer.aiinterviewer.controller;

import com.interviewer.aiinterviewer.controller.dto.InterviewRequest;
import com.interviewer.aiinterviewer.controller.dto.InterviewResponse;
import com.interviewer.aiinterviewer.controller.dto.InterviewStartRequest;
import com.interviewer.aiinterviewer.service.InterviewService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/interview")
public class InterviewController {

    private final InterviewService interviewService;

    public InterviewController(InterviewService interviewService) {
        this.interviewService = interviewService;
    }

    /**
     * 1. 면접 시작 API
     * 분야와 연차를 받아 세션을 초기화하고 맞춤형 페르소나를 셋팅합니다.
     */
    @PostMapping("/start")
    public String startInterview(@RequestBody InterviewStartRequest request) {
        interviewService.initInterview(request.sessionId(), request.jobCategory(), request.experienceLevel());
        return "면접 세션이 성공적으로 생성되었습니다. 지원 분야: " + request.jobCategory() + " (" + request.experienceLevel() + ")";
    }

    /**
     * 2. AI 면접관과의 대화 API
     */
    @PostMapping("/chat")
    public InterviewResponse chat(@RequestBody InterviewRequest request) {
        String reply = interviewService.chat(request.sessionId(), request.message());
        return new InterviewResponse(request.sessionId(), reply);
    }
}