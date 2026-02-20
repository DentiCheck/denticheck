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
            Use only provided detections and rag evidence.
            Return strict JSON only.
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
                    .title(hasText(v.getTitle()) ? v.getTitle() : "소견")
                    .detail(hasText(v.getDetail()) ? v.getDetail() : "치과 검진으로 정확한 확인이 필요합니다.")
                    .evidence((v.getEvidence() == null || v.getEvidence().isEmpty()) ? List.of("rag:0") : v.getEvidence())
                    .build()).toList();
        }

        List<String> careGuide = (llm.getCareGuide() == null || llm.getCareGuide().isEmpty()) ? fallback.getCareGuide() : llm.getCareGuide();
        List<String> disclaimer = (llm.getDisclaimer() == null || llm.getDisclaimer().isEmpty()) ? fallback.getDisclaimer() : llm.getDisclaimer();

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
            case "RED" -> "고위험 소견이 감지되어 빠른 치과 진료가 필요합니다.";
            case "YELLOW" -> "주의가 필요한 소견이 있어 조기 검진을 권장합니다.";
            default -> "현재 고위험 신호는 크지 않지만 정기 관리를 유지하세요.";
        };

        List<AnalyzeResponse.Finding> findings = buildFindings(detections, ragSources);

        return AnalyzeResponse.LlmResult.builder()
                .riskLevel(riskLevel)
                .summary(summary)
                .findings(findings)
                .careGuide(List.of(
                        "하루 2~3회, 불소 치약으로 양치하세요.",
                        "치실/치간칫솔을 하루 1회 사용하세요.",
                        "당류 섭취를 줄이고 식후 구강 관리를 하세요.",
                        "증상이 지속되면 치과 진료를 예약하세요."
                ))
                .disclaimer(List.of(
                        "이 결과는 AI 보조 스크리닝 정보이며 의학적 진단을 대체하지 않습니다.",
                        "통증, 출혈, 궤양, 부종이 지속되면 전문 진료를 받으세요."
                ))
                .build();
    }

    private List<AnalyzeResponse.Finding> buildFindings(
            List<AnalyzeResponse.DetectionItem> detections,
            List<AnalyzeResponse.RagSource> ragSources
    ) {
        if (detections == null || detections.isEmpty()) {
            return List.of(AnalyzeResponse.Finding.builder()
                    .title("특이 소견 없음")
                    .detail("현재 이미지에서 뚜렷한 이상 소견은 확인되지 않았습니다.")
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
            case "oral_cancer" -> "구강 병변 의심 소견이 있습니다 (" + count + "개, 최대 신뢰도 " + String.format(Locale.ROOT, "%.2f", maxConfidence) + ").";
            case "caries" -> "충치 의심 소견이 있습니다 (" + count + "개, 최대 신뢰도 " + String.format(Locale.ROOT, "%.2f", maxConfidence) + ").";
            case "tartar" -> "치석/플라그 축적 소견이 있습니다 (" + count + "개, 최대 신뢰도 " + String.format(Locale.ROOT, "%.2f", maxConfidence) + ").";
            default -> "중요 이상 소견이 감지되지 않았습니다.";
        };
    }

    private String titleFor(String label) {
        return switch (label) {
            case "oral_cancer" -> "구강 병변 의심";
            case "caries" -> "충치 의심";
            case "tartar" -> "치석 의심";
            default -> "정상";
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
