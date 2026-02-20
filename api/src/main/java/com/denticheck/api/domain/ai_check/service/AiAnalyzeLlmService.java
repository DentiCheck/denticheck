package com.denticheck.api.domain.ai_check.service;

import com.denticheck.api.domain.ai_check.dto.AnalyzeResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiAnalyzeLlmService {

    private static final String SYSTEM_PROMPT = """
            You are a dental screening assistant.
            Use only the provided detections and RAG evidence.
            Output strict JSON only.
            All output text must be in English.
            """;

    private static final String USER_PROMPT_TEMPLATE = """
            Input:
            {
              "detections": %s,
              "summary": %s,
              "rag": %s
            }

            Return JSON only:
            {
              "riskLevel": "GREEN|YELLOW|RED",
              "summary": "string",
              "findings": [{"title":"string","detail":"string","evidence":["rag:id"]}],
              "careGuide": ["string"],
              "disclaimer": ["string"]
            }

            Rules:
            - If oral_cancer confidence >= 0.5 then RED.
            - If caries or tartar exists then YELLOW.
            - Otherwise GREEN.
            - All text must be in English.
            """;

    private final ObjectMapper objectMapper;

    @Value("${ollama.enabled:false}")
    private boolean ollamaEnabled;

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.model:llama3:8b}")
    private String ollamaModel;

    @Value("${ollama.generate.timeout-ms:18000}")
    private int ollamaGenerateTimeoutMs;

    public AnalyzeResponse.LlmResult generate(
            List<AnalyzeResponse.DetectionItem> detections,
            Map<String, Object> summary,
            List<AnalyzeResponse.RagSource> ragSources
    ) {
        List<AnalyzeResponse.DetectionItem> safeDetections = detections == null ? List.of() : detections;
        List<AnalyzeResponse.RagSource> safeRagSources = ragSources == null ? List.of() : ragSources;
        Map<String, Object> safeSummary = summary == null ? Map.of() : summary;

        AnalyzeResponse.LlmResult fallback = buildRuleBasedFallback(safeDetections, safeRagSources);
        if (!ollamaEnabled) {
            log.info("Ollama disabled. Using analyze fallback result");
            return fallback;
        }

        long startedAt = System.currentTimeMillis();
        try {
            AnalyzeResponse.LlmResult llm = callOllama(safeDetections, safeSummary, safeRagSources);
            if (llm == null) {
                log.warn("Ollama response empty. Using fallback");
                return fallback;
            }
            AnalyzeResponse.LlmResult validated = enforceSchema(llm, fallback);
            log.info("Ollama analyze response parsed successfully in {}ms", System.currentTimeMillis() - startedAt);
            return validated;
        } catch (Exception e) {
            log.warn("Ollama analyze failed in {}ms. Using fallback", System.currentTimeMillis() - startedAt, e);
            return fallback;
        }
    }

    private AnalyzeResponse.LlmResult callOllama(
            List<AnalyzeResponse.DetectionItem> detections,
            Map<String, Object> summary,
            List<AnalyzeResponse.RagSource> ragSources
    ) throws Exception {
        String detectionsJson = objectMapper.writeValueAsString(detections);
        String summaryJson = objectMapper.writeValueAsString(summary);
        String ragJson = objectMapper.writeValueAsString(ragSources);
        String prompt = USER_PROMPT_TEMPLATE.formatted(detectionsJson, summaryJson, ragJson);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", ollamaModel);
        body.put("stream", false);
        body.put("format", "json");
        body.put("system", SYSTEM_PROMPT);
        body.put("prompt", prompt);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String url = ollamaBaseUrl + "/api/generate";
        ResponseEntity<Map> response = ollamaRestTemplate().postForEntity(url, new HttpEntity<>(body, headers), Map.class);

        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null) return null;

        String json = Objects.toString(responseBody.get("response"), "").trim();
        if (json.isBlank()) return null;

        Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<>() {});
        return objectMapper.convertValue(parsed, AnalyzeResponse.LlmResult.class);
    }

    private AnalyzeResponse.LlmResult enforceSchema(AnalyzeResponse.LlmResult llm, AnalyzeResponse.LlmResult fallback) {
        if (llm == null) return fallback;

        String riskLevel = sanitizeRiskLevel(llm.getRiskLevel(), fallback.getRiskLevel());
        String summary = hasText(llm.getSummary()) ? llm.getSummary() : fallback.getSummary();

        List<AnalyzeResponse.Finding> findings = llm.getFindings();
        if (findings == null || findings.isEmpty()) {
            findings = fallback.getFindings();
        } else {
            findings = findings.stream().limit(3).map(v -> AnalyzeResponse.Finding.builder()
                    .title(hasText(v.getTitle()) ? v.getTitle() : "Finding")
                    .detail(hasText(v.getDetail()) ? v.getDetail() : "Further clinical verification is recommended.")
                    .evidence((v.getEvidence() == null || v.getEvidence().isEmpty()) ? List.of("rag:0") : v.getEvidence())
                    .build()).toList();
        }

        List<String> careGuide = (llm.getCareGuide() == null || llm.getCareGuide().isEmpty())
                ? fallback.getCareGuide()
                : llm.getCareGuide();
        List<String> disclaimer = (llm.getDisclaimer() == null || llm.getDisclaimer().isEmpty())
                ? fallback.getDisclaimer()
                : llm.getDisclaimer();

        return AnalyzeResponse.LlmResult.builder()
                .riskLevel(riskLevel)
                .summary(summary)
                .findings(findings)
                .careGuide(careGuide)
                .disclaimer(disclaimer)
                .build();
    }

    private AnalyzeResponse.LlmResult buildRuleBasedFallback(
            List<AnalyzeResponse.DetectionItem> detections,
            List<AnalyzeResponse.RagSource> ragSources
    ) {
        String riskLevel = computeRiskLevel(detections);
        String summary = switch (riskLevel) {
            case "RED" -> "High-risk findings were detected. Prompt in-person dental consultation is recommended.";
            case "YELLOW" -> "Findings requiring attention were detected. Early dental check-up is recommended.";
            default -> "No strong high-risk signal was detected. Maintain regular oral care and periodic check-ups.";
        };

        List<AnalyzeResponse.Finding> findings = buildFindings(detections, ragSources);

        return AnalyzeResponse.LlmResult.builder()
                .riskLevel(riskLevel)
                .summary(summary)
                .findings(findings)
                .careGuide(List.of(
                        "Brush with fluoride toothpaste 2-3 times daily.",
                        "Use floss or interdental brush once per day.",
                        "Reduce sugar intake and rinse after meals.",
                        "If symptoms persist, schedule a dental visit promptly."
                ))
                .disclaimer(List.of(
                        "This result is AI-assisted screening information and does not replace medical diagnosis.",
                        "If pain, bleeding, ulceration, or swelling persists, seek professional care."
                ))
                .build();
    }

    private List<AnalyzeResponse.Finding> buildFindings(
            List<AnalyzeResponse.DetectionItem> detections,
            List<AnalyzeResponse.RagSource> ragSources
    ) {
        if (detections == null || detections.isEmpty()) {
            return List.of(AnalyzeResponse.Finding.builder()
                    .title("No significant finding")
                    .detail("No clear high-risk pattern was detected in the submitted image.")
                    .evidence(defaultEvidence(ragSources))
                    .build());
        }

        Map<String, List<AnalyzeResponse.DetectionItem>> grouped = new LinkedHashMap<>();
        for (AnalyzeResponse.DetectionItem d : detections) {
            String label = normalizeLabel(d.getLabel());
            grouped.computeIfAbsent(label, k -> new ArrayList<>()).add(d);
        }

        List<String> ordered = List.of("oral_cancer", "caries", "tartar", "normal");
        List<AnalyzeResponse.Finding> findings = new ArrayList<>();
        for (String label : ordered) {
            List<AnalyzeResponse.DetectionItem> items = grouped.getOrDefault(label, List.of());
            if (items.isEmpty()) continue;

            double maxConfidence = items.stream()
                    .map(AnalyzeResponse.DetectionItem::getConfidence)
                    .filter(Objects::nonNull)
                    .mapToDouble(Double::doubleValue)
                    .max()
                    .orElse(0.0);

            findings.add(AnalyzeResponse.Finding.builder()
                    .title(titleFor(label))
                    .detail(detailFor(label, items.size(), maxConfidence))
                    .evidence(defaultEvidence(ragSources))
                    .build());

            if (findings.size() >= 3) break;
        }

        return findings;
    }

    private String detailFor(String label, int count, double maxConfidence) {
        return switch (label) {
            case "oral_cancer" -> "Possible oral lesion signal detected (" + count + " area(s), max confidence " + String.format(Locale.ROOT, "%.2f", maxConfidence) + ").";
            case "caries" -> "Possible caries signal detected (" + count + " area(s), max confidence " + String.format(Locale.ROOT, "%.2f", maxConfidence) + ").";
            case "tartar" -> "Possible tartar/plaque signal detected (" + count + " area(s), max confidence " + String.format(Locale.ROOT, "%.2f", maxConfidence) + ").";
            default -> "No major abnormal finding was detected.";
        };
    }

    private String titleFor(String label) {
        return switch (label) {
            case "oral_cancer" -> "Possible Oral Lesion";
            case "caries" -> "Possible Caries";
            case "tartar" -> "Possible Tartar";
            default -> "Normal";
        };
    }

    private List<String> defaultEvidence(List<AnalyzeResponse.RagSource> ragSources) {
        if (ragSources == null || ragSources.isEmpty()) {
            return List.of("rag:0");
        }
        List<String> evidence = new ArrayList<>();
        for (int i = 0; i < ragSources.size() && i < 2; i++) {
            evidence.add("rag:" + i);
        }
        return evidence;
    }

    private String computeRiskLevel(List<AnalyzeResponse.DetectionItem> detections) {
        boolean hasCariesOrTartar = false;
        for (AnalyzeResponse.DetectionItem d : detections) {
            String label = normalizeLabel(d.getLabel());
            double confidence = d.getConfidence() == null ? 0.0 : d.getConfidence();
            if ("oral_cancer".equals(label) && confidence >= 0.5) return "RED";
            if ("caries".equals(label) || "tartar".equals(label)) hasCariesOrTartar = true;
        }
        return hasCariesOrTartar ? "YELLOW" : "GREEN";
    }

    private String normalizeLabel(String raw) {
        String label = raw == null ? "normal" : raw.toLowerCase(Locale.ROOT).trim();
        return switch (label) {
            case "caries", "cavity" -> "caries";
            case "tartar", "calculus", "plaque" -> "tartar";
            case "oral_cancer", "oral cancer", "lesion", "mass", "ulcer" -> "oral_cancer";
            default -> "normal";
        };
    }

    private String sanitizeRiskLevel(String level, String fallback) {
        if (!hasText(level)) return fallback;
        String upper = level.toUpperCase(Locale.ROOT).trim();
        return switch (upper) {
            case "GREEN", "YELLOW", "RED" -> upper;
            default -> fallback;
        };
    }

    private boolean hasText(String text) {
        return text != null && !text.isBlank();
    }

    private RestTemplate ollamaRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(ollamaGenerateTimeoutMs);
        factory.setReadTimeout(ollamaGenerateTimeoutMs);
        return new RestTemplate(factory);
    }
}
