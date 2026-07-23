package com.interviewer.aiinterviewer.controller;

import com.interviewer.aiinterviewer.controller.dto.InterviewRequest;
import com.interviewer.aiinterviewer.controller.dto.InterviewResponse;
import com.interviewer.aiinterviewer.controller.dto.InterviewSaveRequest;
import com.interviewer.aiinterviewer.controller.dto.InterviewStartRequest;
import com.interviewer.aiinterviewer.domain.InterviewResult;
import com.interviewer.aiinterviewer.service.InterviewService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/interview")
public class InterviewController {

    private final InterviewService interviewService;

    public InterviewController(InterviewService interviewService) {
        this.interviewService = interviewService;
    }

    /**
     * ⭐️ 면접 결과 저장 및 AI 종합 피드백 반환 API
     */
    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> saveInterviewResult(@RequestBody InterviewSaveRequest request) {
        // 1. 서비스에서 저장 처리 후 생성된 Entity를 반환받음
        InterviewResult savedResult = interviewService.saveResult(request);

        // 2. 프론트엔드로 전달할 응답 데이터 구성
        Map<String, Object> response = new HashMap<>();
        response.put("message", "면접 결과가 성공적으로 데이터베이스에 저장되었습니다.");
        response.put("aiFeedback", savedResult.getAiFeedback()); // ⭐️ AI 피드백 전달!

        return ResponseEntity.ok(response);
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

    /**
     * 3. 전체 면접 기록 목록 조회 API
     */
    @GetMapping("/history")
    public ResponseEntity<List<InterviewResult>> getAllHistory() {
        List<InterviewResult> historyList = interviewService.getAllInterviewHistory();
        return ResponseEntity.ok(historyList);
    }

    /**
     * 4. 특정 면접 기록 상세 조회 API
     */
    @GetMapping("/history/{sessionId}")
    public ResponseEntity<InterviewResult> getHistoryDetail(@PathVariable String sessionId) {
        InterviewResult result = interviewService.getInterviewDetail(sessionId);
        return ResponseEntity.ok(result);
    }
}