package com.interviewer.aiinterviewer.controller;

import com.interviewer.aiinterviewer.controller.dto.InterviewRequest;
import com.interviewer.aiinterviewer.controller.dto.InterviewResponse;
import com.interviewer.aiinterviewer.controller.dto.InterviewSaveRequest;
import com.interviewer.aiinterviewer.controller.dto.InterviewStartRequest;
import com.interviewer.aiinterviewer.domain.InterviewResult;
import com.interviewer.aiinterviewer.service.InterviewService;
import com.interviewer.aiinterviewer.util.FileParserUtil;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication; // ⭐️ 추가
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/interview")
@CrossOrigin(origins = "http://localhost:5173") // <-- 이 부분 추가!
public class InterviewController {

    private final InterviewService interviewService;

    public InterviewController(InterviewService interviewService) {
        this.interviewService = interviewService;
    }

    /**
     * ⭐️ 이력서 파일 첨부 지원 면접 시작 API (기존 유지)
     */
    @PostMapping(value = "/start-with-resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> startInterviewWithResume(
            @RequestPart("sessionId") String sessionId,
            @RequestPart("jobCategory") String jobCategory,
            @RequestPart("experienceLevel") String experienceLevel,
            @RequestPart(value = "resumeFile", required = false) MultipartFile resumeFile) {

        Map<String, Object> response = new HashMap<>();

        try {
            String extractedResumeText = "";
            if (resumeFile != null && !resumeFile.isEmpty()) {
                extractedResumeText = FileParserUtil.extractText(resumeFile);
            }

            String initialQuestion = interviewService.startInterviewWithResume(
                    sessionId, jobCategory, experienceLevel, extractedResumeText
            );

            response.put("status", "success");
            response.put("sessionId", sessionId);
            response.put("reply", initialQuestion);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "이력서 처리 중 오류가 발생했습니다: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * 1. 기존 면접 시작 API (기존 유지)
     */
    @PostMapping("/start")
    public String startInterview(@RequestBody InterviewStartRequest request) {
        interviewService.initInterview(request.sessionId(), request.jobCategory(), request.experienceLevel());
        return "면접 세션이 성공적으로 생성되었습니다. 지원 분야: " + request.jobCategory() + " (" + request.experienceLevel() + ")";
    }

    /**
     * 2. AI 면접관과의 대화 API (기존 유지)
     */
    @PostMapping("/chat")
    public InterviewResponse chat(@RequestBody InterviewRequest request) {
        String reply = interviewService.chat(request.sessionId(), request.message());
        return new InterviewResponse(request.sessionId(), reply);
    }

    /**
     * 3. 면접 결과 저장 및 AI 종합 피드백 반환 API (기존 유지)
     */
    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> saveInterviewResult(@RequestBody InterviewSaveRequest request) {
        // 만약 /save 로 넘어왔어도 username이 존재하면 유저와 연동해서 저장되도록 보완
        InterviewResult savedResult;
        if (request.username() != null && !request.username().isBlank()) {
            savedResult = interviewService.saveResultWithUser(request, request.username());
        } else {
            savedResult = interviewService.saveResult(request);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "면접 결과가 성공적으로 데이터베이스에 저장되었습니다.");
        response.put("aiFeedback", savedResult.getAiFeedback());

        return ResponseEntity.ok(response);
    }

    /**
     * ⭐️ [신규 추가] 로그인한 유저 정보와 함께 면접 결과를 저장하는 API
     */
    @PostMapping("/save-with-user")
    public ResponseEntity<Map<String, Object>> saveInterviewResultWithUser(@RequestBody InterviewSaveRequest dto) {
        String username = dto.username();

        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "사용자 정보가 필요합니다."));
        }

        // ⭕ [수정 완료] 유저 연동 메서드(saveResultWithUser)로 호출하고 유저 정보(username)를 함께 넘겨줍니다!
        InterviewResult savedResult = interviewService.saveResultWithUser(dto, username);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "면접 결과가 성공적으로 데이터베이스에 저장되었습니다.");
        response.put("aiFeedback", savedResult.getAiFeedback());

        return ResponseEntity.ok(response);
    }

    /**
     * 4. 전체 면접 기록 목록 조회 API (기존 유지)
     */
    @GetMapping("/history")
    public ResponseEntity<List<InterviewResult>> getAllHistory() {
        List<InterviewResult> historyList = interviewService.getAllInterviewHistory();
        return ResponseEntity.ok(historyList);
    }

    /**
     * ⭐️ [수정] 로그인한 나의 면접 기록 목록만 조회하는 API
     */
    @GetMapping("/my-history")
    public ResponseEntity<List<InterviewResult>> getMyHistory(@RequestParam("username") String username) {
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        List<InterviewResult> historyList = interviewService.getMyInterviewHistory(username);
        return ResponseEntity.ok(historyList);
    }

    /**
     * 5. 특정 면접 기록 상세 조회 API (기존 유지)
     */
    @GetMapping("/history/{sessionId}")
    public ResponseEntity<InterviewResult> getHistoryDetail(@PathVariable String sessionId) {
        InterviewResult result = interviewService.getInterviewDetail(sessionId);
        return ResponseEntity.ok(result);
    }
}