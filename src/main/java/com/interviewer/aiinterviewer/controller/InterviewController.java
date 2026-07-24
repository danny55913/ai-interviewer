package com.interviewer.aiinterviewer.controller;

import com.interviewer.aiinterviewer.controller.dto.InterviewRequest;
import com.interviewer.aiinterviewer.controller.dto.InterviewResponse;
import com.interviewer.aiinterviewer.controller.dto.InterviewSaveRequest;
import com.interviewer.aiinterviewer.controller.dto.InterviewStartRequest;
import com.interviewer.aiinterviewer.domain.InterviewResult;
import com.interviewer.aiinterviewer.service.InterviewService;
import com.interviewer.aiinterviewer.util.FileParserUtil; // FileParserUtil import
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
     * ⭐️ [신규] 이력서 파일 첨부 지원 면접 시작 API
     * MultipartForm 데이터 수신을 위해 consumes = MediaType.MULTIPART_FORM_DATA_VALUE 설정
     */
    @PostMapping(value = "/start-with-resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> startInterviewWithResume(
            @RequestPart("sessionId") String sessionId,
            @RequestPart("jobCategory") String jobCategory,
            @RequestPart("experienceLevel") String experienceLevel,
            @RequestPart(value = "resumeFile", required = false) MultipartFile resumeFile) {

        Map<String, Object> response = new HashMap<>();

        try {
            // 1. 파일에서 텍스트 추출 (FileParserUtil 사용)
            String extractedResumeText = "";
            if (resumeFile != null && !resumeFile.isEmpty()) {
                extractedResumeText = FileParserUtil.extractText(resumeFile);
            }

            // 2. 이력서 텍스트 기반 세션 초기화 및 첫 기술 질문 생성
            String initialQuestion = interviewService.startInterviewWithResume(
                    sessionId, jobCategory, experienceLevel, extractedResumeText
            );

            response.put("status", "success");
            response.put("sessionId", sessionId);
            response.put("reply", initialQuestion); // ⭐️ 생성된 첫 맞춤 질문 반환!

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "이력서 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * 1. 기존 면접 시작 API (JSON 요청용 - 기존 유지)
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
     * 3. 면접 결과 저장 및 AI 종합 피드백 반환 API
     */
    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> saveInterviewResult(@RequestBody InterviewSaveRequest request) {
        InterviewResult savedResult = interviewService.saveResult(request);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "면접 결과가 성공적으로 데이터베이스에 저장되었습니다.");
        response.put("aiFeedback", savedResult.getAiFeedback());

        return ResponseEntity.ok(response);
    }

    /**
     * 4. 전체 면접 기록 목록 조회 API
     */
    @GetMapping("/history")
    public ResponseEntity<List<InterviewResult>> getAllHistory() {
        List<InterviewResult> historyList = interviewService.getAllInterviewHistory();
        return ResponseEntity.ok(historyList);
    }

    /**
     * 5. 특정 면접 기록 상세 조회 API
     */
    @GetMapping("/history/{sessionId}")
    public ResponseEntity<InterviewResult> getHistoryDetail(@PathVariable String sessionId) {
        InterviewResult result = interviewService.getInterviewDetail(sessionId);
        return ResponseEntity.ok(result);
    }
}