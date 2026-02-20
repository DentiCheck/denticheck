package com.denticheck.api.domain.ai_check.service;

import com.denticheck.api.domain.ai_check.dto.AiCheckRunResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiLlmResultService {

    @Value("${ai.analyze.enabled:true}")
    private boolean aiEnabled;

    public AiCheckRunResponse.LlmResult generate(
            List<AiCheckRunResponse.DetectionItem> detections,
            boolean qualityPass,
            double qualityScore,
            List<String> contexts
    ) {
        List<AiCheckRunResponse.DetectionItem> safeDetections = detections == null ? List.of() : detections;
        AiCheckRunResponse.LlmResult fallback = buildRuleBased(safeDetections);
        if (!aiEnabled) {
            return fallback;
        }

        try {
            return fallback;
        } catch (Exception e) {
            log.warn("Legacy LLM generation failed. Using rule-based fallback", e);
            return fallback;
        }
    }

    public AiCheckRunResponse.LlmResult forQualityFailed(List<?> contexts) {
        AiCheckRunResponse.LlmResult result = buildRuleBased(List.of());
        return AiCheckRunResponse.LlmResult.builder()
                .overall(AiCheckRunResponse.Overall.builder()
                        .level("GREEN")
                        .badgeText("Low Risk")
                        .oneLineSummary("Image quality was insufficient for precise analysis.")
                        .build())
                .findings(result.getFindings())
                .careGuide(List.of(
                        "Retake in a bright environment.",
                        "Keep camera focus stable and avoid blur.",
                        "Include both teeth and gum area in frame.",
                        "If you have symptoms, consult a dentist."
                ))
                .disclaimer(result.getDisclaimer())
                .ragCitations(result.getRagCitations())
                .build();
    }

    private AiCheckRunResponse.LlmResult buildRuleBased(List<AiCheckRunResponse.DetectionItem> detections) {
        Map<String, List<AiCheckRunResponse.DetectionItem>> grouped = detections.stream()
                .filter(d -> d.getLabel() != null)
                .map(this::normalizeDetectionLabel)
                .collect(Collectors.groupingBy(d -> d.getLabel().toLowerCase(Locale.ROOT)));

        String level = computeOverallLevel(grouped);
        String badgeText = switch (level) {
            case "RED" -> "High Risk";
            case "YELLOW" -> "Medium Risk";
            default -> "Low Risk";
        };

        String oneLineSummary = switch (level) {
            case "RED" -> "High-risk signs were detected. Prompt clinical consultation is recommended.";
            case "YELLOW" -> "Findings requiring attention were detected.";
            default -> "No strong abnormal signal was detected.";
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
                        "This output is AI-assisted screening information and does not replace medical diagnosis.",
                        "If pain, bleeding, ulceration, or swelling persists, seek professional care."
                ))
                .ragCitations(List.of())
                .build();
    }

    private AiCheckRunResponse.DetectionItem normalizeDetectionLabel(AiCheckRunResponse.DetectionItem d) {
        String raw = d.getLabel() == null ? "normal" : d.getLabel().toLowerCase(Locale.ROOT).trim();
        String normalized = switch (raw) {
            case "caries", "cavity" -> "caries";
            case "tartar", "calculus", "plaque" -> "tartar";
            case "oral_cancer", "lesion", "mass", "ulcer" -> "oral_cancer";
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
            if (items.isEmpty()) continue;
            if ("normal".equals(label) && grouped.size() > 1) continue;

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

            if (findings.size() >= 3) break;
        }
        return findings;
    }

    private String severityFor(String label, double confidence) {
        if ("oral_cancer".equals(label) && confidence >= 0.5) {
            return "High";
        }
        if (confidence >= 0.75) {
            return "Moderate";
        }
        return "Low";
    }

    private String locationText(AiCheckRunResponse.DetectionItem detection) {
        if (detection == null || detection.getBbox() == null) {
            return "Location unavailable";
        }

        double x = detection.getBbox().getX() == null ? 0.5 : detection.getBbox().getX();
        double y = detection.getBbox().getY() == null ? 0.5 : detection.getBbox().getY();

        String upperLower = y < 0.5 ? "Upper" : "Lower";
        String side = x < 0.33 ? "Left" : (x > 0.67 ? "Right" : "Center");
        return upperLower + " " + side;
    }

    private String labelToTitle(String label) {
        return switch (label) {
            case "caries" -> "Possible Caries";
            case "tartar" -> "Possible Tartar";
            case "oral_cancer" -> "Possible Oral Lesion";
            default -> "Normal";
        };
    }

    private List<String> buildCareGuide(String level) {
        if ("RED".equals(level)) {
            return List.of(
                    "Seek dental or oral specialist consultation as soon as possible.",
                    "Avoid smoking, alcohol, and irritant foods.",
                    "Monitor pain, bleeding, and ulcer changes closely.",
                    "Do not delay in-person care if symptoms worsen."
            );
        }
        if ("YELLOW".equals(level)) {
            return List.of(
                    "Brush 2-3 times daily with fluoride toothpaste.",
                    "Use floss or interdental brush every day.",
                    "Reduce sugar intake and improve post-meal oral care.",
                    "Plan scaling or dental check-up within 3-6 months."
            );
        }
        return List.of(
                "Maintain your current oral hygiene routine.",
                "Have regular check-ups every 6-12 months.",
                "Using floss or interdental brush can improve prevention.",
                "If new symptoms appear, consult a dentist early."
        );
    }

    private AiCheckRunResponse.Finding defaultNormalFinding() {
        return AiCheckRunResponse.Finding.builder()
                .title("Normal")
                .severity("Low")
                .locationText("Whole area")
                .evidence(AiCheckRunResponse.Evidence.builder()
                        .labels(List.of("normal"))
                        .count(0)
                        .maxConfidence(0.0)
                        .build())
                .build();
    }
}
