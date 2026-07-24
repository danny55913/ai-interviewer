package com.interviewer.aiinterviewer.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. CORS 설정 적용
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // 2. CSRF 비활성화 (REST API 및 H2 콘솔)
                .csrf(csrf -> csrf.disable())

                // 3. ⭐️ H2 콘솔 Frame 허용 (화면 안 뜨는 현상 방지)
                .headers(headers -> headers.frameOptions(frame -> frame.disable()))

                // 4. Request 권한 설정
                .authorizeHttpRequests(auth -> auth
                        // Preflight 요청(OPTIONS)은 모두 허용
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // ⭐️ H2 콘솔 관련 요청 모두 허용
                        .requestMatchers("/h2-console/**").permitAll()
                        // 로그인, 회원가입 등 누구나 접근 가능해야 하는 경로
                        .requestMatchers("/api/auth/**").permitAll()
                        // 면접 시작 관련 API 허용
                        .requestMatchers("/api/interview/**").permitAll()
                        .anyRequest().authenticated()
                );

        return http.build();
    }

    // CORS 세부 설정 Bean
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(List.of("http://localhost:5173"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}