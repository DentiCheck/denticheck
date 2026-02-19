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
public class AnalyzeResponse {
    private String sessionId;
    private String status;
    private String pdfUrl;
    private List<DetectionItem> detections;
    private RagSummary rag;
    private LlmResult llmResult;

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetectionItem {
        private String label;
        private Double confidence;
        private BBox bbox;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BBox {
        private Double x;
        private Double y;
        private Double w;
        private Double h;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RagSummary {
        private Integer topK;
        private List<RagSource> sources;
        private Boolean usedFallback;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RagSource {
        private String source;
        private Double score;
        private String snippet;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LlmResult {
        private String riskLevel;
        private String summary;
        private List<Finding> findings;
        private List<String> careGuide;
        private List<String> disclaimer;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Finding {
        private String title;
        private String detail;
        private List<String> evidence;
    }
}
