package com.interviewer.aiinterviewer.domain;

import jakarta.persistence.*;
import lombok.*; // Lombok 어노테이션 import
import java.time.LocalDateTime;
import com.interviewer.aiinterviewer.entity.User;

@Entity
@Builder
@AllArgsConstructor // Builder 사용을 위해 필요
@Table(name = "interview_result")
public class InterviewResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String sessionId;

    @Column(nullable = false)
    private String jobCategory;

    @Column(nullable = false)
    private String experienceLevel;

    @Column(columnDefinition = "TEXT")
    private String fullChatHistory; // 전체 대화 내역 요약 혹은 날것의 기록

    @Column(columnDefinition = "TEXT")
    private String aiFeedback; // AI가 최종 평가한 강점/약점 피드백 결과

    private Integer durationSeconds; // 면접이 진행된 시간 (초 단위)

    private LocalDateTime createdAt;

    // ⭐️ [추가] 유저(User) 계정과 묶어주기 위한 N:1 연관관계
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    // JPA용 기본 생성자
    protected InterviewResult() {}

    // 기존 생성자 (유저 없이 생성할 상황도 대비)
    public InterviewResult(String sessionId, String jobCategory, String experienceLevel, String fullChatHistory, String aiFeedback, Integer durationSeconds) {
        this.sessionId = sessionId;
        this.jobCategory = jobCategory;
        this.experienceLevel = experienceLevel;
        this.fullChatHistory = fullChatHistory;
        this.aiFeedback = aiFeedback;
        this.durationSeconds = durationSeconds;
        this.createdAt = LocalDateTime.now();
    }

    // ⭐️ [추가] 유저를 포함하는 생성자
    public InterviewResult(String sessionId, String jobCategory, String experienceLevel, String fullChatHistory, String aiFeedback, Integer durationSeconds, User user) {
        this(sessionId, jobCategory, experienceLevel, fullChatHistory, aiFeedback, durationSeconds);
        this.user = user;
    }

    @PrePersist
    public void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    // 데이터 조회를 위해 Getter만 열어둡니다.
    public Long getId() { return id; }
    public String getSessionId() { return sessionId; }
    public String getJobCategory() { return jobCategory; }
    public String getExperienceLevel() { return experienceLevel; }
    public String getFullChatHistory() { return fullChatHistory; }
    public String getAiFeedback() { return aiFeedback; }
    public Integer getDurationSeconds() { return durationSeconds; }
    public LocalDateTime getCreatedAt() { return createdAt; }

    // ⭐️ [추가] User Getter
    public User getUser() { return user; }
}