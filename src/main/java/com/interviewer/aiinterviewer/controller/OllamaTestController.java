package com.interviewer.aiinterviewer.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.ollama.OllamaChatModel;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class OllamaTestController {

    private final OllamaChatModel chatModel;

    @GetMapping("/api/test/chat")
    public String chat(@RequestParam(value = "message", defaultValue = "안녕? 반가워.") String message) {
        try {
            return chatModel.call(message);
        } catch (Exception e) {
            return "Ollama 통신 실패: " + e.getMessage();
        }
    }
}