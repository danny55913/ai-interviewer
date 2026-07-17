package com.interviewer.aiinterviewer.controller.dto;

public record InterviewRequest(
        String sessionId,
        String message
) {
    // 기본 생성자나 편의를 위해 default 세션 설정을 추가할 수 있습니다.
    public InterviewRequest {
        if (sessionId == null || sessionId.isBlank()) {
            sessionId = "default-session";
        }
    }
}