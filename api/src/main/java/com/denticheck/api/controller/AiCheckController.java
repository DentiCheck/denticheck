package com.denticheck.api.controller;

import com.denticheck.api.domain.ai_check.dto.AiCheckRunResponse;
import com.denticheck.api.domain.ai_check.dto.AnalyzeResponse;
import com.denticheck.api.domain.ai_check.service.AiCheckOrchestratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AiCheckController {

    private final AiCheckOrchestratorService aiCheckOrchestratorService;

    @PostMapping(value = "/ai-check", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public AiCheckRunResponse runAiCheck(@RequestPart("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("파일이 비어있습니다.");
        }
        return aiCheckOrchestratorService.run(file);
    }

    @PostMapping(value = "/ai-check/quick", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public AiCheckRunResponse runAiCheckQuick(@RequestPart("file") MultipartFile file) {
        return aiCheckOrchestratorService.runQuick(file);
    }

    @PostMapping(value = "/ai-check/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public AnalyzeResponse runAiCheckAnalyze(
            @RequestPart("file") MultipartFile file,
            @RequestParam(value = "generatePdf", defaultValue = "true") boolean generatePdf) {
        return aiCheckOrchestratorService.runAnalyze(file, generatePdf);
    }
}
