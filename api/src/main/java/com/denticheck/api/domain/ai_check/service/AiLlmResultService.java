package com.denticheck.api.domain.ai_check.service;

import com.denticheck.api.domain.ai_check.dto.AiCheckRunResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiLlmResultService {

    private static final List<String> SUPPORTED_LABELS = List.of("caries", "tartar", "oral_cancer", "normal");

    private static final String SYSTEM_PROMPT = """
            You are a dental screening explanation assistant.
            The input is object detection output from YOLO and retrieval contexts from Milvus.
            This is NOT a medical diagnosis.
            Never claim confirmed diagnosis. Use suspicious/possible wording only.
            Ground your explanation on the given contexts.
            Output must be JSON only and must follow the requested schema exactly.
            """;

    private static final String USER_PROMPT_TEMPLATE = """
            Generate UI JSON from the following inputs.

            Rules:
            1) overall.level:
               - RED if oral_cancer exists and maxConfidence >= 0.5
               - YELLOW if caries or tartar exists
               - GREEN otherwise
            2) findings: up to 3 grouped findings by label
            3) severity:
               - oral_cancer with confidence >= 0.5 => \"고위험\"
               - confidence >= 0.75 => \"중등도\"
               - 0.5 to 0.75 => \"경미\"
               - else \"경미\"
            4) careGuide: 4 to 6 short Korean sentences
            5) disclaimer: 2 to 3 Korean sentences
            6) ragCitations: include short snippet and source from the provided contexts
            7) Return JSON only.

            detections:
            %s

            quality:
            {"qualityPass": %s, "qualityScore": %.4f}

            contexts:
            %s
            """;

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ollama.enabled:false}")
    private boolean ollamaEnabled;

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.model:llama3:8b}")
    private String ollamaModel;

    public AiCheckRunResponse.LlmResult generate(
            List<AiCheckRunResponse.DetectionItem> detections,
            boolean qualityPass,
            double qualityScore,
            List<MilvusRagService.RagContext> contexts
    ) {
        List<AiCheckRunResponse.DetectionItem> safeDetections = detections == null ? List.of() : detections;
        List<MilvusRagService.RagContext> safeContexts = contexts == null ? List.of() : contexts;

        AiCheckRunResponse.LlmResult fallback = buildRuleBased(safeDetections, safeContexts);
        if (!ollamaEnabled) {
            return fallback;
        }

        try {
            AiCheckRunResponse.LlmResult llm = callOllama(safeDetections, qualityPass, qualityScore, safeContexts);
            if (llm == null) {
                return fallback;
            }
            return enforceRules(llm, safeDetections, safeContexts);
        } catch (Exception e) {
            log.warn("Ollama generation failed. Using rule-based fallback", e);
            return fallback;
        }
    }

    public AiCheckRunResponse.LlmResult forQualityFailed(List<MilvusRagService.RagContext> contexts) {
        AiCheckRunResponse.LlmResult result = buildRuleBased(List.of(), contexts);
        return AiCheckRunResponse.LlmResult.builder()
                .overall(AiCheckRunResponse.Overall.builder()
                        .level("GREEN")
                        .badgeText("위험도 낮음")
                        .oneLineSummary("이미지 품질이 낮아 정확한 분석이 어려웠습니다.")
                        .build())
                .findings(result.getFindings())
                .careGuide(List.of(
                        "밝은 환경에서 입안을 선명하게 촬영해 주세요.",
                        "카메라 초점을 맞추고 흔들림 없이 촬영해 주세요.",
                        "치아와 잇몸이 함께 보이도록 촬영 범위를 조정해 주세요.",
                        "통증이나 출혈이 있으면 치과 상담을 권장합니다."
                ))
                .disclaimer(result.getDisclaimer())
                .ragCitations(result.getRagCitations())
                .build();
    }

    private AiCheckRunResponse.LlmResult callOllama(
            List<AiCheckRunResponse.DetectionItem> detections,
            boolean qualityPass,
            double qualityScore,
            List<MilvusRagService.RagContext> contexts
    ) throws Exception {
        String detectionsJson = objectMapper.writeValueAsString(detections);
        String contextsJson = objectMapper.writeValueAsString(contexts);
        String prompt = USER_PROMPT_TEMPLATE.formatted(detectionsJson, qualityPass, qualityScore, contextsJson);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", ollamaModel);
        body.put("stream", false);
        body.put("format", "json");
        body.put("system", SYSTEM_PROMPT);
        body.put("prompt", prompt);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String url = ollamaBaseUrl + "/api/generate";
        ResponseEntity<Map> response = restTemplate.postForEntity(url, new HttpEntity<>(body, headers), Map.class);
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
        return objectMapper.convertValue(parsed, AiCheckRunResponse.LlmResult.class);
    }

    private AiCheckRunResponse.LlmResult enforceRules(
            AiCheckRunResponse.LlmResult llm,
            List<AiCheckRunResponse.DetectionItem> detections,
            List<MilvusRagService.RagContext> contexts
    ) {
        AiCheckRunResponse.LlmResult rule = buildRuleBased(detections, contexts);

        String oneLineSummary = rule.getOverall().getOneLineSummary();
        if (llm.getOverall() != null && hasText(llm.getOverall().getOneLineSummary())) {
            oneLineSummary = llm.getOverall().getOneLineSummary();
        }

        List<AiCheckRunResponse.Finding> findings = llm.getFindings();
        if (findings == null || findings.isEmpty()) {
            findings = rule.getFindings();
        } else {
            findings = findings.stream().limit(3).map(this::sanitizeFinding).toList();
        }

        List<String> careGuide = llm.getCareGuide();
        if (careGuide == null || careGuide.isEmpty()) {
            careGuide = rule.getCareGuide();
        }

        List<String> disclaimer = llm.getDisclaimer();
        if (disclaimer == null || disclaimer.isEmpty()) {
            disclaimer = rule.getDisclaimer();
        }

        List<AiCheckRunResponse.RagCitation> ragCitations = llm.getRagCitations();
        if (ragCitations == null || ragCitations.isEmpty()) {
            ragCitations = rule.getRagCitations();
        }

        return AiCheckRunResponse.LlmResult.builder()
                .overall(AiCheckRunResponse.Overall.builder()
                        .level(rule.getOverall().getLevel())
                        .badgeText(rule.getOverall().getBadgeText())
                        .oneLineSummary(oneLineSummary)
                        .build())
                .findings(findings)
                .careGuide(careGuide)
                .disclaimer(disclaimer)
                .ragCitations(ragCitations)
                .build();
    }

    private AiCheckRunResponse.Finding sanitizeFinding(AiCheckRunResponse.Finding finding) {
        if (finding == null) {
            return defaultNormalFinding();
        }

        AiCheckRunResponse.Evidence evidence = finding.getEvidence();
        if (evidence == null) {
            evidence = AiCheckRunResponse.Evidence.builder()
                    .labels(List.of("normal"))
                    .count(0)
                    .maxConfidence(0.0)
                    .build();
        }

        return AiCheckRunResponse.Finding.builder()
                .title(hasText(finding.getTitle()) ? finding.getTitle() : "정상")
                .severity(hasText(finding.getSeverity()) ? finding.getSeverity() : "경미")
                .locationText(hasText(finding.getLocationText()) ? finding.getLocationText() : "위치 정보 제한")
                .evidence(evidence)
                .build();
    }

    private AiCheckRunResponse.LlmResult buildRuleBased(
            List<AiCheckRunResponse.DetectionItem> detections,
            List<MilvusRagService.RagContext> contexts
    ) {
        Map<String, List<AiCheckRunResponse.DetectionItem>> grouped = detections.stream()
                .filter(d -> d.getLabel() != null)
                .map(this::normalizeDetectionLabel)
                .collect(Collectors.groupingBy(d -> d.getLabel().toLowerCase(Locale.ROOT)));

        String level = computeOverallLevel(grouped);
        String badgeText = switch (level) {
            case "RED" -> "위험도 높음";
            case "YELLOW" -> "위험도 보통";
            default -> "위험도 낮음";
        };

        String oneLineSummary = switch (level) {
            case "RED" -> "고위험 의심 소견이 있어 빠른 진료 상담이 필요합니다.";
            case "YELLOW" -> "관리가 필요한 의심 소견이 확인되었습니다.";
            default -> "특이 소견이 뚜렷하지 않습니다.";
        };

        return AiCheckRunResponse.LlmResult.builder()
                .overall(AiCheckRunResponse.Overall.builder()
                        .level(level)
                        .badgeText(badgeText)
                        .oneLineSummary(oneLineSummary)
                        .build())
                .findings(buildFindings(grouped))
                .careGuide(buildCareGuide(level))
                .disclaimer(List.of(
                        "이 결과는 AI 스크리닝 참고 정보이며 의료 확진이 아닙니다.",
                        "통증, 출혈, 궤양 등 증상이 있으면 치과 진료를 권장합니다."
                ))
                .ragCitations(contexts.stream().limit(5).map(v ->
                        AiCheckRunResponse.RagCitation.builder()
                                .source(v.getSource())
                                .snippet(trimSnippet(v.getText()))
                                .build()
                ).toList())
                .build();
    }

    private AiCheckRunResponse.DetectionItem normalizeDetectionLabel(AiCheckRunResponse.DetectionItem d) {
        String raw = d.getLabel() == null ? "normal" : d.getLabel().toLowerCase(Locale.ROOT).trim();
        String normalized = switch (raw) {
            case "caries", "cavity" -> "caries";
            case "tartar", "calculus", "plaque" -> "tartar";
            case "oral_cancer", "lesion", "mass", "ulcer" -> "oral_cancer";
            case "normal" -> "normal";
            default -> "normal";
        };

        return AiCheckRunResponse.DetectionItem.builder()
                .label(normalized)
                .confidence(d.getConfidence())
                .bbox(d.getBbox())
                .build();
    }

    private String computeOverallLevel(Map<String, List<AiCheckRunResponse.DetectionItem>> grouped) {
        double oralCancerMax = grouped.getOrDefault("oral_cancer", List.of())
                .stream()
                .map(AiCheckRunResponse.DetectionItem::getConfidence)
                .filter(Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(0.0);

        if (oralCancerMax >= 0.5) {
            return "RED";
        }
        if (!grouped.getOrDefault("caries", List.of()).isEmpty() || !grouped.getOrDefault("tartar", List.of()).isEmpty()) {
            return "YELLOW";
        }
        return "GREEN";
    }

    private List<AiCheckRunResponse.Finding> buildFindings(Map<String, List<AiCheckRunResponse.DetectionItem>> grouped) {
        if (grouped.isEmpty() || (grouped.size() == 1 && grouped.containsKey("normal"))) {
            return List.of(defaultNormalFinding());
        }

        List<String> ordered = List.of("oral_cancer", "caries", "tartar", "normal");
        List<AiCheckRunResponse.Finding> findings = new ArrayList<>();

        for (String label : ordered) {
            List<AiCheckRunResponse.DetectionItem> items = grouped.getOrDefault(label, List.of());
            if (items.isEmpty()) {
                continue;
            }
            if ("normal".equals(label) && grouped.size() > 1) {
                continue;
            }

            double maxConfidence = items.stream()
                    .map(AiCheckRunResponse.DetectionItem::getConfidence)
                    .filter(Objects::nonNull)
                    .max(Comparator.naturalOrder())
                    .orElse(0.0);

            AiCheckRunResponse.DetectionItem best = items.stream()
                    .max(Comparator.comparing(v -> v.getConfidence() == null ? 0.0 : v.getConfidence()))
                    .orElse(null);

            findings.add(AiCheckRunResponse.Finding.builder()
                    .title(labelToTitle(label))
                    .severity(severityFor(label, maxConfidence))
                    .locationText(locationText(best))
                    .evidence(AiCheckRunResponse.Evidence.builder()
                            .labels(List.of(label))
                            .count(items.size())
                            .maxConfidence(maxConfidence)
                            .build())
                    .build());

            if (findings.size() >= 3) {
                break;
            }
        }
        return findings;
    }

    private String severityFor(String label, double confidence) {
        if ("oral_cancer".equals(label) && confidence >= 0.5) {
            return "고위험";
        }
        if (confidence >= 0.75) {
            return "중등도";
        }
        return "경미";
    }

    private String locationText(AiCheckRunResponse.DetectionItem detection) {
        if (detection == null || detection.getBbox() == null) {
            return "위치 정보 제한";
        }

        double x = detection.getBbox().getX() == null ? 0.5 : detection.getBbox().getX();
        double y = detection.getBbox().getY() == null ? 0.5 : detection.getBbox().getY();

        String upperLower = y < 0.5 ? "상악" : "하악";
        String side;
        if (x < 0.33) {
            side = "좌측";
        } else if (x > 0.67) {
            side = "우측";
        } else {
            side = "전치부";
        }
        return upperLower + " " + side;
    }

    private String labelToTitle(String label) {
        return switch (label) {
            case "caries" -> "충치 의심";
            case "tartar" -> "치석";
            case "oral_cancer" -> "구강 병변 의심";
            default -> "정상";
        };
    }

    private List<String> buildCareGuide(String level) {
        if ("RED".equals(level)) {
            return List.of(
                    "가능한 빠르게 치과 또는 구강악안면외과 상담을 받아 주세요.",
                    "해당 부위를 자극하는 음식과 흡연, 음주를 피해주세요.",
                    "통증, 출혈, 궤양 지속 여부를 관찰하고 기록해 주세요.",
                    "증상이 지속되면 지체하지 말고 대면 진료를 받으세요."
            );
        }
        if ("YELLOW".equals(level)) {
            return List.of(
                    "하루 2~3회 불소치약으로 꼼꼼히 양치해 주세요.",
                    "치실이나 치간칫솔을 함께 사용해 치면 세정을 강화해 주세요.",
                    "당 섭취 빈도를 줄이고 식후 구강 관리를 해주세요.",
                    "3~6개월 내 스케일링 또는 검진 일정을 권장합니다."
            );
        }
        return List.of(
                "현재 구강 위생 습관을 유지해 주세요.",
                "정기 검진(6~12개월)을 통해 상태를 확인해 주세요.",
                "치실 또는 치간칫솔 사용을 병행하면 도움이 됩니다.",
                "새로운 증상이 생기면 조기에 상담을 받아 주세요."
        );
    }

    private AiCheckRunResponse.Finding defaultNormalFinding() {
        return AiCheckRunResponse.Finding.builder()
                .title("정상")
                .severity("경미")
                .locationText("전체")
                .evidence(AiCheckRunResponse.Evidence.builder()
                        .labels(List.of("normal"))
                        .count(0)
                        .maxConfidence(0.0)
                        .build())
                .build();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String trimSnippet(String text) {
        if (text == null) {
            return "";
        }
        String flat = text.replace('\n', ' ').trim();
        return flat.length() <= 140 ? flat : flat.substring(0, 140) + "...";
    }
}
