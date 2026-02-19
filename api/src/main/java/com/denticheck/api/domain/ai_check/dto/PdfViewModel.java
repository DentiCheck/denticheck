package com.denticheck.api.domain.ai_check.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PdfViewModel {
    private RiskSummary riskSummary;
    private List<Problem> problems;
    private List<String> actions;
    private Visit visit;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RiskSummary {
        private String levelText;
        private String oneLineSummary;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Problem {
        private String title;
        private String reason;
        private String action;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Visit {
        private String level;
        private String reason;
    }
}
