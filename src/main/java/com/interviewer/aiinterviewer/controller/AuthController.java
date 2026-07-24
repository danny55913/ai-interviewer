package com.interviewer.aiinterviewer.controller;

import com.interviewer.aiinterviewer.controller.dto.AuthResponse;
import com.interviewer.aiinterviewer.controller.dto.LoginRequest;
import com.interviewer.aiinterviewer.controller.dto.SignupRequest;
import com.interviewer.aiinterviewer.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public ResponseEntity<String> signup(@RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}