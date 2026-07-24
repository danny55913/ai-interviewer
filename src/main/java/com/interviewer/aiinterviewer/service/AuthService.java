package com.interviewer.aiinterviewer.service;

import com.interviewer.aiinterviewer.controller.dto.AuthResponse;
import com.interviewer.aiinterviewer.controller.dto.LoginRequest;
import com.interviewer.aiinterviewer.controller.dto.SignupRequest;
import com.interviewer.aiinterviewer.entity.User;
import com.interviewer.aiinterviewer.repository.UserRepository;
import com.interviewer.aiinterviewer.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public String signup(SignupRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new IllegalArgumentException("이미 존재하는 아이디입니다.");
        }

        User user = new User(
                null,
                request.getUsername(),
                passwordEncoder.encode(request.getPassword()),
                request.getName()
        );

        userRepository.save(user);
        return "회원가입이 완료되었습니다.";
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 아이디입니다."));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        String token = jwtTokenProvider.createToken(user.getUsername());
        return new AuthResponse(token, user.getUsername(), user.getName());
    }
}