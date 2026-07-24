package com.interviewer.aiinterviewer.controller.dto;

public record InterviewSaveRequest(
        String username,
        String sessionId,
        String jobCategory,
        String experienceLevel,
        String fullChatHistory,
        String aiFeedback
) {}