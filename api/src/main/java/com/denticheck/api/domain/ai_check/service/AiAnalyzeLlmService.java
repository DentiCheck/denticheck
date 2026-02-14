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
            너는 치과 검진 보조 AI다. 이 결과는 진단이 아니다.
            제공된 detections와 RAG 근거만 사용하라.
            반드시 유효한 JSON만 출력하고, 스키마를 정확히 지켜라.
            마크다운, 코드펜스, 설명 문장 등 JSON 이외 텍스트를 출력하지 마라.
            summary/findings/careGuide/disclaimer는 반드시 한국어로 작성하라.
            """;

    private static final String USER_PROMPT_TEMPLATE = """
            입력:
            {
              "detections": %s,
              "summary": %s,
              "rag": %s
            }

            다음 필드로 JSON만 반환:
            {
              "riskLevel": "GREEN|YELLOW|RED",
              "summary": "문자열 (1~3줄, 한국어)",
              "findings": [{"title":"string","detail":"string","evidence":["rag:sourceId or short citation"]}],
              "careGuide": ["string","string"],
              "disclaimer": ["string"]
            }

            규칙:
            - riskLevel: oral_cancer confidence >= 0.5면 RED, caries/tartar가 있으면 YELLOW, 그 외 GREEN.
            - findings는 가능하면 RAG source를 근거로 인용한다.
            - 결과 문구는 한국어로 작성한다.
            - JSON 외 텍스트 금지.
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
            List<AnalyzeResponse.RagSource> ragSources) {
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
            long elapsed = System.currentTimeMillis() - startedAt;
            log.info("Ollama analyze response parsed successfully in {}ms", elapsed);
            return validated;
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startedAt;
            log.warn("Ollama analyze failed in {}ms. Using fallback", elapsed, e);
            return fallback;
        }
    }

    private AnalyzeResponse.LlmResult callOllama(
            List<AnalyzeResponse.DetectionItem> detections,
            Map<String, Object> summary,
            List<AnalyzeResponse.RagSource> ragSources) throws Exception {
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
        long requestStart = System.currentTimeMillis();
        ResponseEntity<Map> response = ollamaRestTemplate().postForEntity(url, new HttpEntity<>(body, headers),
                Map.class);
        long elapsed = System.currentTimeMillis() - requestStart;
        log.info("Ollama generate request completed in {}ms", elapsed);

        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null) {
            return null;
        }

        String json = Objects.toString(responseBody.get("response"), "").trim();
        if (json.isBlank()) {
            return null;
        }

        Map<String, Object> parsed = objectMapper.readValue(json, new TypeReference<>() {
        });
        return objectMapper.convertValue(parsed, AnalyzeResponse.LlmResult.class);
    }

    private AnalyzeResponse.LlmResult enforceSchema(AnalyzeResponse.LlmResult llm, AnalyzeResponse.LlmResult fallback) {
        if (llm == null) {
            return fallback;
        }

        String riskLevel = sanitizeRiskLevel(llm.getRiskLevel(), fallback.getRiskLevel());
        String summary = hasText(llm.getSummary()) ? llm.getSummary() : fallback.getSummary();

        List<AnalyzeResponse.Finding> findings = llm.getFindings();
        if (findings == null || findings.isEmpty()) {
            findings = fallback.getFindings();
        } else {
            findings = findings.stream().limit(3).map(v -> AnalyzeResponse.Finding.builder()
                    .title(hasText(v.getTitle()) ? v.getTitle() : "소견")
                    .detail(hasText(v.getDetail()) ? v.getDetail() : "치과 진료를 통해 확인이 필요합니다.")
                    .evidence(
                            (v.getEvidence() == null || v.getEvidence().isEmpty()) ? List.of("rag:0") : v.getEvidence())
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
            List<AnalyzeResponse.RagSource> ragSources) {
        String riskLevel = computeRiskLevel(detections);
        String summary = switch (riskLevel) {
            case "RED" -> "고위험 의심 소견이 감지되었습니다. 가능한 빠르게 치과 또는 구강내과 진료를 권장합니다.";
            case "YELLOW" -> "주의가 필요한 소견이 감지되었습니다. 비응급 치과 검진과 위생 관리 강화를 권장합니다.";
            default -> "고위험 패턴은 감지되지 않았습니다. 정기 검진과 기본 구강 관리를 유지하세요.";
        };

        List<AnalyzeResponse.Finding> findings = buildFindings(detections, ragSources);

        return AnalyzeResponse.LlmResult.builder()
                .riskLevel(riskLevel)
                .summary(summary)
                .findings(findings)
                .careGuide(List.of(
                        "불소 치약으로 하루 2~3회 양치하세요.",
                        "하루 1회 치실 또는 치간칫솔을 사용하세요.",
                        "당분 섭취를 줄이고 흡연은 피하세요.",
                        "증상이 지속되면 치과 진료를 예약하세요."))
                .disclaimer(List.of(
                        "이 결과는 AI 보조 스크리닝 참고 정보이며 의학적 진단이 아닙니다.",
                        "통증, 출혈, 궤양, 부종 또는 증상 악화가 지속되면 전문 진료를 받으세요."))
                .build();
    }

    private List<AnalyzeResponse.Finding> buildFindings(
            List<AnalyzeResponse.DetectionItem> detections,
            List<AnalyzeResponse.RagSource> ragSources) {
        if (detections == null || detections.isEmpty()) {
            return List.of(AnalyzeResponse.Finding.builder()
                    .title("뚜렷한 병변 신호 없음")
                    .detail("이 이미지에서는 높은 신뢰도의 병변 소견이 확인되지 않았습니다.")
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
            if (items.isEmpty()) {
                continue;
            }
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
            if (findings.size() >= 3) {
                break;
            }
        }
        return findings.isEmpty() ? List.of(AnalyzeResponse.Finding.builder()
                .title("뚜렷한 병변 신호 없음")
                .detail("이 이미지에서는 높은 신뢰도의 병변 소견이 확인되지 않았습니다.")
                .evidence(defaultEvidence(ragSources))
                .build()) : findings;
    }

    private String detailFor(String label, int count, double maxConfidence) {
        return switch (label) {
            case "oral_cancer" -> "구강 병변 의심 소견이 감지되었습니다 (" + count + "개 영역, 최대 신뢰도 "
                    + String.format(Locale.ROOT, "%.2f", maxConfidence) + "). 빠른 대면 진료를 권장합니다.";
            case "caries" -> "충치 의심 소견이 감지되었습니다 (" + count + "개 영역, 최대 신뢰도 "
                    + String.format(Locale.ROOT, "%.2f", maxConfidence) + "). 치과 검진과 위생 관리 강화가 필요합니다.";
            case "tartar" -> "치석/치태 의심 소견이 감지되었습니다 (" + count + "개 영역, 최대 신뢰도 "
                    + String.format(Locale.ROOT, "%.2f", maxConfidence) + "). 스케일링 등 전문 관리가 도움이 될 수 있습니다.";
            default -> "중요 병변 범주의 감지 소견은 없습니다.";
        };
    }

    private String titleFor(String label) {
        return switch (label) {
            case "oral_cancer" -> "구강 병변 의심";
            case "caries" -> "충치 의심";
            case "tartar" -> "치석 의심";
            default -> "정상 패턴";
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
            if ("oral_cancer".equals(label) && confidence >= 0.5) {
                return "RED";
            }
            if ("caries".equals(label) || "tartar".equals(label)) {
                hasCariesOrTartar = true;
            }
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
        if (!hasText(level)) {
            return fallback;
        }
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
