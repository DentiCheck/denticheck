package com.denticheck.api.domain.ai_check.service;

import com.denticheck.api.domain.ai_check.dto.AnalyzeResponse;
import com.denticheck.api.domain.ai_check.dto.PdfViewModel;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class AnalyzePdfViewMapper {

    private static final List<String> FALLBACK_ACTIONS = List.of(
            "오늘부터 하루 2~3회, 2분씩 부드럽게 양치하세요.",
            "자기 전 치실을 1회 사용하고, 사용 후 물로 헹구세요.",
            "단 음식은 식사 시간에만 먹고, 먹은 뒤 물을 마시세요.",
            "1주 안에 치과 검진 예약을 잡으세요."
    );

    public PdfViewModel toPdfViewModel(AnalyzeResponse.LlmResult llmResult, List<AnalyzeResponse.DetectionItem> detections) {
        List<AnalyzeResponse.DetectionItem> safeDetections = detections == null ? List.of() : detections;
        AnalyzeResponse.LlmResult safeLlm = llmResult == null ? AnalyzeResponse.LlmResult.builder().build() : llmResult;

        String riskLevel = normalizeRiskLevel(safeLlm.getRiskLevel());
        PdfViewModel.RiskSummary riskSummary = PdfViewModel.RiskSummary.builder()
                .levelText(riskLevelText(riskLevel))
                .oneLineSummary(buildOneLineSummary(safeLlm.getSummary(), riskLevel))
                .build();

        List<PdfViewModel.Problem> problems = buildProblems(safeDetections, safeLlm.getFindings());
        List<String> actions = buildActions(safeLlm.getCareGuide());
        PdfViewModel.Visit visit = buildVisit(riskLevel, safeDetections);

        return PdfViewModel.builder()
                .riskSummary(riskSummary)
                .problems(problems)
                .actions(actions)
                .visit(visit)
                .build();
    }

    private String normalizeRiskLevel(String raw) {
        if (raw == null) {
            return "GREEN";
        }
        String upper = raw.toUpperCase(Locale.ROOT).trim();
        return switch (upper) {
            case "RED", "YELLOW", "GREEN" -> upper;
            default -> "GREEN";
        };
    }

    private String riskLevelText(String riskLevel) {
        return switch (riskLevel) {
            case "RED" -> "높음(빨강)";
            case "YELLOW" -> "보통(노랑)";
            default -> "낮음(초록)";
        };
    }

    private String buildOneLineSummary(String summary, String riskLevel) {
        String clean = sanitizeKorean(summary);
        if (!clean.isBlank()) {
            return clean;
        }
        return switch (riskLevel) {
            case "RED" -> "확인이 필요한 부위가 있어 가까운 시일 내 치과 확인을 권장합니다.";
            case "YELLOW" -> "주의가 필요한 부위가 보여 생활 관리와 검진을 권장합니다.";
            default -> "큰 이상 신호는 적어 보이지만 정기 검진은 유지하세요.";
        };
    }

    private List<PdfViewModel.Problem> buildProblems(
            List<AnalyzeResponse.DetectionItem> detections,
            List<AnalyzeResponse.Finding> findings
    ) {
        List<PdfViewModel.Problem> fromDetections = new ArrayList<>();
        Set<String> labels = new LinkedHashSet<>();
        for (AnalyzeResponse.DetectionItem detection : detections) {
            if (detection == null || detection.getLabel() == null) {
                continue;
            }
            labels.add(normalizeLabel(detection.getLabel()));
        }

        for (String label : labels) {
            PdfViewModel.Problem problem = problemFromLabel(label);
            if (problem != null) {
                fromDetections.add(problem);
            }
            if (fromDetections.size() >= 3) {
                break;
            }
        }

        if (!fromDetections.isEmpty()) {
            return fromDetections;
        }

        List<AnalyzeResponse.Finding> safeFindings = findings == null ? List.of() : findings;
        List<PdfViewModel.Problem> fromFindings = new ArrayList<>();
        for (AnalyzeResponse.Finding finding : safeFindings) {
            if (finding == null) {
                continue;
            }
            fromFindings.add(PdfViewModel.Problem.builder()
                    .title(emptyToDefault(sanitizeKorean(finding.getTitle()), "확인 필요"))
                    .reason(emptyToDefault(sanitizeKorean(finding.getDetail()), "확인이 필요한 부위가 보입니다."))
                    .action("무리한 자가 판단보다 치과 검진으로 확인하세요.")
                    .build());
            if (fromFindings.size() >= 3) {
                break;
            }
        }

        return fromFindings;
    }

    private PdfViewModel.Problem problemFromLabel(String label) {
        return switch (label) {
            case "caries" -> PdfViewModel.Problem.builder()
                    .title("충치 의심")
                    .reason("치아 표면에 손상으로 보이는 부위가 있습니다.")
                    .action("단 음식과 탄산음료를 줄이고 치과 검진을 예약하세요.")
                    .build();
            case "tartar" -> PdfViewModel.Problem.builder()
                    .title("치석·잇몸 자극 의심")
                    .reason("잇몸 주변에 자극을 줄 수 있는 부위가 보입니다.")
                    .action("부드럽게 양치하고, 스케일링 상담을 받아보세요.")
                    .build();
            case "oral_cancer" -> PdfViewModel.Problem.builder()
                    .title("입안 이상 부위 의심")
                    .reason("입안 점막에 확인이 필요한 부위가 보입니다.")
                    .action("가까운 시일 내 치과 진료를 받아 정확히 확인하세요.")
                    .build();
            default -> null;
        };
    }

    private List<String> buildActions(List<String> careGuide) {
        List<String> safeGuide = careGuide == null ? List.of() : careGuide;
        Set<String> merged = new LinkedHashSet<>();

        for (String line : safeGuide) {
            String sanitized = sanitizeKorean(line);
            if (!sanitized.isBlank()) {
                merged.add(sanitized);
            }
            if (merged.size() >= 4) {
                break;
            }
        }

        for (String fallback : FALLBACK_ACTIONS) {
            merged.add(fallback);
            if (merged.size() >= 4) {
                break;
            }
        }

        return new ArrayList<>(merged);
    }

    private PdfViewModel.Visit buildVisit(String riskLevel, List<AnalyzeResponse.DetectionItem> detections) {
        boolean hasOralFinding = detections.stream()
                .filter(d -> d != null && d.getLabel() != null)
                .map(d -> normalizeLabel(d.getLabel()))
                .anyMatch("oral_cancer"::equals);

        if (hasOralFinding) {
            return PdfViewModel.Visit.builder()
                    .level("긴급")
                    .reason("입안 이상 부위가 의심되어 빠른 진료 확인이 필요합니다.")
                    .build();
        }

        if ("RED".equals(riskLevel) || "YELLOW".equals(riskLevel)) {
            return PdfViewModel.Visit.builder()
                    .level("권장")
                    .reason("확인이 필요한 부위가 있어 가까운 시일 내 검진이 좋습니다.")
                    .build();
        }

        return PdfViewModel.Visit.builder()
                .level("관찰")
                .reason("뚜렷한 이상 신호는 적지만 정기 검진은 유지하세요.")
                .build();
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

    private String sanitizeKorean(String text) {
        if (text == null) {
            return "";
        }
        String withoutEnglish = text.replaceAll("[A-Za-z]+", " ");
        String compact = withoutEnglish.replaceAll("\\s+", " ").trim();
        return compact;
    }

    private String emptyToDefault(String text, String fallback) {
        return text == null || text.isBlank() ? fallback : text;
    }
}
