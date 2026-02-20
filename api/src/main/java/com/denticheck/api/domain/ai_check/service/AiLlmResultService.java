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
                        .badgeText("위험도 낮음")
                        .oneLineSummary("이미지 품질 이슈로 정확한 분석이 어려웠습니다.")
                        .build())
                .findings(result.getFindings())
                .careGuide(List.of(
                        "밝은 조명에서 입안을 다시 촬영해 주세요.",
                        "카메라 초점을 맞추고 흔들림 없이 촬영해 주세요.",
                        "치아와 잇몸이 함께 보이도록 촬영 범위를 조정해 주세요.",
                        "통증이나 출혈이 있으면 치과 상담을 권장합니다."
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
            case "RED" -> "위험도 높음";
            case "YELLOW" -> "위험도 보통";
            default -> "위험도 낮음";
        };

        String oneLineSummary = switch (level) {
            case "RED" -> "고위험 소견이 있어 빠른 진료 상담이 필요합니다.";
            case "YELLOW" -> "관리가 필요한 소견이 확인되었습니다.";
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
                        "이 결과는 AI 스크리닝 참고 정보이며 의료 진단을 대체하지 않습니다.",
                        "통증, 출혈, 궤양 등 증상이 있으면 치과 진료를 권장합니다."
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
        String side = x < 0.33 ? "좌측" : (x > 0.67 ? "우측" : "중앙부");
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
                    "가능하면 빠르게 치과 또는 구강외과 상담을 받으세요.",
                    "해당 부위를 자극하는 음식과 흡연·음주는 피하세요.",
                    "통증, 출혈, 궤양 변화를 관찰하고 기록하세요.",
                    "증상이 악화되면 지체하지 말고 대면 진료를 받으세요."
            );
        }
        if ("YELLOW".equals(level)) {
            return List.of(
                    "하루 2~3회, 불소 치약으로 양치하세요.",
                    "치실/치간칫솔을 함께 사용하세요.",
                    "당류 섭취를 줄이고 식후 구강 관리를 습관화하세요.",
                    "3~6개월 내 스케일링 또는 검진을 권장합니다."
            );
        }
        return List.of(
                "현재 구강 위생 습관을 유지하세요.",
                "6~12개월 주기 정기 검진을 받으세요.",
                "치실/치간칫솔 사용을 병행하면 예방에 도움이 됩니다.",
                "새로운 증상이 생기면 조기에 치과 상담을 받으세요."
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
}
