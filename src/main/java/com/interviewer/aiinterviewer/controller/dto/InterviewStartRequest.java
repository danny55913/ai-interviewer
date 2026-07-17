package com.interviewer.aiinterviewer.controller.dto;

public record InterviewStartRequest(
        String sessionId,
        String jobCategory,  // 예: "Java Backend", "React Frontend"
        String experienceLevel // 예: "신입", "3년차 경력직"
) {
}