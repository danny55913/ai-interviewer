package com.interviewer.aiinterviewer.repository;

import com.interviewer.aiinterviewer.domain.InterviewResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface InterviewResultRepository extends JpaRepository<InterviewResult, Long> {
    // 세션 ID로 기존 면접 결과를 찾아오는 메서드
    Optional<InterviewResult> findBySessionId(String sessionId);

    // 최신 면접 순으로 전체 기록 조회
    List<InterviewResult> findAllByOrderByCreatedAtDesc();
}