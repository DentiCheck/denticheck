package com.denticheck.api.domain.ai_check.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiCheckRunResponse {
    private String sessionId;
    private String status;
    private String storageKey;
    private String imageUrl;
    private Boolean qualityPass;
    private Double qualityScore;
    private List<String> qualityReasons;
    private List<DetectionItem> detections;
    private Map<String, Object> summary;
    private LlmResult llmResult;
    private String pdfUrl;
    private RagSummary rag;

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
    public static class LlmResult {
        private Overall overall;
        private List<Finding> findings;
        private List<String> careGuide;
        private List<String> disclaimer;
        private List<RagCitation> ragCitations;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Overall {
        private String level;
        private String badgeText;
        private String oneLineSummary;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Finding {
        private String title;
        private String severity;
        private String locationText;
        private Evidence evidence;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Evidence {
        private List<String> labels;
        private Integer count;
        private Double maxConfidence;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RagCitation {
        private String source;
        private String snippet;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RagSummary {
        private Integer topK;
        private List<RagSource> sources;
    }

    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RagSource {
        private String source;
        private Double score;
    }
}
