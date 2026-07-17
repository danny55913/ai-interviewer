package com.interviewer.aiinterviewer.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // 모든 경로(API)에 대해 CORS 허용
                .allowedOrigins(
                        "http://localhost:3000", // 리액트 기본 포트
                        "http://localhost:5173", // Vite 리액트 기본 포트
                        "http://127.0.0.1:3000"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // 허용할 HTTP 메서드
                .allowedHeaders("*") // 모든 헤더 허용
                .allowCredentials(true) // 쿠키 세션 등을 주고받을 수 있도록 허용
                .maxAge(3600); // 프리플라이트(Preflight) 요청 캐싱 시간 (초)
    }
}