package com.interviewer.aiinterviewer.repository;

import com.interviewer.aiinterviewer.entity.User; // entity 패키지의 User 지정
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // 아이디로 사용자 조회 (로그인 및 인증용)
    Optional<User> findByUsername(String username);

    // 회원가입 시 아이디 중복 확인용
    boolean existsByUsername(String username);
}