package com.denticheck.api.domain.ai_check.service;

import com.denticheck.api.domain.ai_check.dto.AiCheckRunResponse;
import com.denticheck.api.domain.ai_check.dto.AnalyzeResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiCheckOrchestratorService {

    private static final List<String> ALLOWED_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".webp");

    @Value("${ai.client.url}")
    private String aiBaseUrl;

    @Value("${ai.client.timeout:5000}")
    private int aiClientTimeoutMs;

    @Value("${ai.analyze.timeout-ms:25000}")
    private int analyzeTimeoutMs;

    private final MilvusRagService milvusRagService;
    private final AiLlmResultService aiLlmResultService;
    private final AiAnalyzeLlmService aiAnalyzeLlmService;
    private final PdfReportService pdfReportService;
    private final ReportStorageService reportStorageService;

    public AiCheckRunResponse run(MultipartFile file) {
        String sessionId = UUID.randomUUID().toString();
        String storageKey = "ai-check/" + sessionId + "/upload";
        String imageUrl = "local";

        if (file == null || file.isEmpty()) {
            return errorResponse(sessionId, storageKey, imageUrl, "empty_file");
        }
        if (!isAllowedImage(file.getOriginalFilename())) {
            return errorResponse(sessionId, storageKey, imageUrl, "unsupported_extension");
        }

        try {
            Map<String, Object> quality = postMultipartToAi("/v1/quality", file);
            boolean qualityPass = asBoolean(quality.getOrDefault("pass", quality.get("pass_")));
            double qualityScore = asDouble(quality.get("score"));
            List<String> qualityReasons = asStringList(quality.get("reasons"));

            if (!qualityPass) {
                List<MilvusRagService.RagContext> contexts = milvusRagService.retrieveContexts(Collections.emptyList());
                AiCheckRunResponse.LlmResult llmResult = aiLlmResultService.forQualityFailed(contexts);
                String pdfUrl = createAndStorePdf(sessionId, llmResult, Collections.emptyList());

                return AiCheckRunResponse.builder()
                        .sessionId(sessionId)
                        .status("quality_failed")
                        .storageKey(storageKey)
                        .imageUrl(imageUrl)
                        .qualityPass(false)
                        .qualityScore(qualityScore)
                        .qualityReasons(qualityReasons)
                        .detections(Collections.emptyList())
                        .summary(Collections.emptyMap())
                        .llmResult(llmResult)
                        .pdfUrl(pdfUrl)
                        .rag(toRagSummary(contexts))
                        .build();
            }

            Map<String, Object> detect = postMultipartToAi("/v1/detect", file);
            List<AiCheckRunResponse.DetectionItem> detections = toDetections(detect.get("detections"));
            Map<String, Object> summary = asMap(detect.get("summary"));

            List<MilvusRagService.RagContext> contexts = milvusRagService.retrieveContexts(detections);
            AiCheckRunResponse.LlmResult llmResult = aiLlmResultService.generate(detections, true, qualityScore, contexts);
            String pdfUrl = createAndStorePdf(sessionId, llmResult, detections);

            return AiCheckRunResponse.builder()
                    .sessionId(sessionId)
                    .status("done")
                    .storageKey(storageKey)
                    .imageUrl(imageUrl)
                    .qualityPass(true)
                    .qualityScore(qualityScore)
                    .qualityReasons(qualityReasons)
                    .detections(detections)
                    .summary(summary)
                    .llmResult(llmResult)
                    .pdfUrl(pdfUrl)
                    .rag(toRagSummary(contexts))
                    .build();
        } catch (Exception e) {
            log.error("AI check pipeline failed", e);
            return errorResponse(sessionId, storageKey, imageUrl, "pipeline_error");
        }
    }

    public AiCheckRunResponse runQuick(MultipartFile file) {
        String sessionId = UUID.randomUUID().toString();
        String storageKey = "ai-check/" + sessionId + "/upload";
        String imageUrl = "local";

        if (file == null || file.isEmpty()) {
            return quickErrorResponse(sessionId, storageKey, imageUrl, "empty_file");
        }
        if (!isAllowedImage(file.getOriginalFilename())) {
            return quickErrorResponse(sessionId, storageKey, imageUrl, "unsupported_extension");
        }

        try {
            Map<String, Object> quality = postMultipartToAi("/v1/quality", file);
            boolean qualityPass = asBoolean(quality.getOrDefault("pass", quality.get("pass_")));
            double qualityScore = asDouble(quality.get("score"));
            List<String> qualityReasons = asStringList(quality.get("reasons"));

            if (!qualityPass) {
                return AiCheckRunResponse.builder()
                        .sessionId(sessionId)
                        .status("quality_failed")
                        .storageKey(storageKey)
                        .imageUrl(imageUrl)
                        .qualityPass(false)
                        .qualityScore(qualityScore)
                        .qualityReasons(qualityReasons)
                        .detections(Collections.emptyList())
                        .summary(Collections.emptyMap())
                        .build();
            }

            Map<String, Object> detect = postMultipartToAi("/v1/detect", file);
            List<AiCheckRunResponse.DetectionItem> detections = toDetections(detect.get("detections"));
            Map<String, Object> summary = asMap(detect.get("summary"));

            return AiCheckRunResponse.builder()
                    .sessionId(sessionId)
                    .status("done")
                    .storageKey(storageKey)
                    .imageUrl(imageUrl)
                    .qualityPass(true)
                    .qualityScore(qualityScore)
                    .qualityReasons(qualityReasons)
                    .detections(detections)
                    .summary(summary)
                    .build();
        } catch (Exception e) {
            log.error("AI quick check failed", e);
            return quickErrorResponse(sessionId, storageKey, imageUrl, "pipeline_error");
        }
    }

    public AnalyzeResponse runAnalyze(MultipartFile file, boolean generatePdf) {
        String sessionId = UUID.randomUUID().toString();
        if (file == null || file.isEmpty()) {
            return analyzeErrorResponse(sessionId, "empty_file");
        }
        if (!isAllowedImage(file.getOriginalFilename())) {
            return analyzeErrorResponse(sessionId, "unsupported_extension");
        }

        try {
            CompletableFuture<AnalyzeResponse> future = CompletableFuture.supplyAsync(
                    () -> runAnalyzeInternal(sessionId, file, generatePdf)
            );
            return future.get(analyzeTimeoutMs, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            log.warn("Analyze pipeline timed out or failed for session {}. Fallback response returned", sessionId, e);
            return analyzeFallbackResponse(sessionId);
        }
    }

    private AnalyzeResponse runAnalyzeInternal(String sessionId, MultipartFile file, boolean generatePdf) {
        try {
            Map<String, Object> quality = postMultipartToAi("/v1/quality", file);
            boolean qualityPass = asBoolean(quality.getOrDefault("pass", quality.get("pass_")));

            if (!qualityPass) {
                MilvusRagService.RagSearchResult ragResult = milvusRagService.search(
                        "Low quality dental image. Provide retry guidance and safe disclaimer.",
                        8
                );
                List<AnalyzeResponse.RagSource> ragSources = toAnalyzeRagSources(ragResult.getContexts());
                AnalyzeResponse.LlmResult llmResult = aiAnalyzeLlmService.generate(
                        List.of(),
                        Map.of("qualityPass", false),
                        ragSources
                );

                if (generatePdf) {
                    AiCheckRunResponse.LlmResult legacyLlm = aiLlmResultService.generate(List.of(), false, 0.0, ragResult.getContexts());
                    createAndStorePdf(sessionId, legacyLlm, List.of());
                }

                return AnalyzeResponse.builder()
                        .sessionId(sessionId)
                        .status("done")
                        .detections(List.of())
                        .rag(AnalyzeResponse.RagSummary.builder()
                                .topK(8)
                                .sources(ragSources)
                                .usedFallback(ragResult.isUsedFallback())
                                .build())
                        .llmResult(llmResult)
                        .build();
            }

            Map<String, Object> detect = postMultipartToAi("/v1/detect", file);
            List<AiCheckRunResponse.DetectionItem> detections = toDetections(detect.get("detections"));
            Map<String, Object> summary = asMap(detect.get("summary"));

            String query = buildQueryFromDetections(detections, summary);
            MilvusRagService.RagSearchResult ragResult = milvusRagService.search(query, 8);
            List<AnalyzeResponse.RagSource> ragSources = toAnalyzeRagSources(ragResult.getContexts());
            List<AnalyzeResponse.DetectionItem> analyzeDetections = toAnalyzeDetections(detections);

            AnalyzeResponse.LlmResult llmResult = aiAnalyzeLlmService.generate(analyzeDetections, summary, ragSources);

            if (generatePdf) {
                AiCheckRunResponse.LlmResult legacyLlm = aiLlmResultService.generate(detections, true, 1.0, ragResult.getContexts());
                createAndStorePdf(sessionId, legacyLlm, detections);
            }

            return AnalyzeResponse.builder()
                    .sessionId(sessionId)
                    .status("done")
                    .detections(analyzeDetections)
                    .rag(AnalyzeResponse.RagSummary.builder()
                            .topK(8)
                            .sources(ragSources)
                            .usedFallback(ragResult.isUsedFallback())
                            .build())
                    .llmResult(llmResult)
                    .build();
        } catch (Exception e) {
            log.warn("Analyze pipeline failed for session {}. Returning fallback", sessionId, e);
            return analyzeFallbackResponse(sessionId);
        }
    }

    private String createAndStorePdf(
            String sessionId,
            AiCheckRunResponse.LlmResult llmResult,
            List<AiCheckRunResponse.DetectionItem> detections
    ) {
        byte[] pdf = pdfReportService.generate(sessionId, llmResult, detections);
        return reportStorageService.uploadPdf(sessionId, pdf);
    }

    private AiCheckRunResponse.RagSummary toRagSummary(List<MilvusRagService.RagContext> contexts) {
        List<AiCheckRunResponse.RagSource> sources = contexts.stream()
                .map(v -> AiCheckRunResponse.RagSource.builder()
                        .source(v.getSource())
                        .score(v.getScore())
                        .build())
                .toList();

        return AiCheckRunResponse.RagSummary.builder()
                .topK(milvusRagService.getTopK())
                .sources(sources)
                .build();
    }

    private Map<String, Object> postMultipartToAi(String path, MultipartFile file) throws IOException {
        String url = aiBaseUrl + path;
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() {
                return file.getOriginalFilename() == null ? "upload.jpg" : file.getOriginalFilename();
            }
        };

        HttpHeaders partHeaders = new HttpHeaders();
        partHeaders.setContentDisposition(ContentDisposition
                .builder("form-data")
                .name("file")
                .filename(resource.getFilename())
                .build());
        partHeaders.setContentType(MediaType.parseMediaType(
                file.getContentType() == null ? "application/octet-stream" : file.getContentType()));

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new HttpEntity<>(resource, partHeaders));

        HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = aiRestTemplate().postForEntity(url, entity, Map.class);
        return response.getBody() == null ? Collections.emptyMap() : response.getBody();
    }

    private boolean isAllowedImage(String filename) {
        if (filename == null) return false;
        String lower = filename.toLowerCase(Locale.ROOT);
        return ALLOWED_EXTENSIONS.stream().anyMatch(lower::endsWith);
    }

    private boolean asBoolean(Object v) {
        if (v instanceof Boolean b) return b;
        if (v instanceof String s) return Boolean.parseBoolean(s);
        return false;
    }

    private double asDouble(Object v) {
        if (v instanceof Number n) return n.doubleValue();
        if (v instanceof String s) {
            try {
                return Double.parseDouble(s);
            } catch (NumberFormatException ignored) {
                return 0.0;
            }
        }
        return 0.0;
    }

    @SuppressWarnings("unchecked")
    private List<String> asStringList(Object v) {
        if (!(v instanceof List<?> list)) {
            return Collections.emptyList();
        }
        List<String> out = new ArrayList<>();
        for (Object item : list) {
            if (item != null) out.add(String.valueOf(item));
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object v) {
        if (v instanceof Map<?, ?> m) {
            Map<String, Object> out = new LinkedHashMap<>();
            for (Map.Entry<?, ?> e : m.entrySet()) {
                out.put(String.valueOf(e.getKey()), e.getValue());
            }
            return out;
        }
        return Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    private List<AiCheckRunResponse.DetectionItem> toDetections(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return Collections.emptyList();
        }

        List<AiCheckRunResponse.DetectionItem> out = new ArrayList<>();
        for (Object item : list) {
            if (!(item instanceof Map<?, ?> m)) continue;

            String label = normalizeLabel(Objects.toString(m.get("label"), "normal"));
            double confidence = asDouble(m.get("confidence"));
            Map<String, Object> bboxMap = asMap(m.get("bbox"));

            out.add(AiCheckRunResponse.DetectionItem.builder()
                    .label(label)
                    .confidence(confidence)
                    .bbox(AiCheckRunResponse.BBox.builder()
                            .x(asDouble(bboxMap.get("x")))
                            .y(asDouble(bboxMap.get("y")))
                            .w(asDouble(bboxMap.get("w")))
                            .h(asDouble(bboxMap.get("h")))
                            .build())
                    .build());
        }
        return out;
    }

    private String normalizeLabel(String raw) {
        String label = raw == null ? "normal" : raw.toLowerCase(Locale.ROOT).trim();
        return switch (label) {
            case "caries", "cavity" -> "caries";
            case "tartar", "calculus", "plaque" -> "tartar";
            case "oral_cancer", "lesion", "mass", "ulcer" -> "oral_cancer";
            case "normal" -> "normal";
            default -> "normal";
        };
    }

    private AiCheckRunResponse errorResponse(String sessionId, String storageKey, String imageUrl, String reason) {
        List<MilvusRagService.RagContext> contexts = milvusRagService.retrieveContexts(Collections.emptyList());
        AiCheckRunResponse.LlmResult llmResult = aiLlmResultService.generate(Collections.emptyList(), false, 0.0, contexts);
        String pdfUrl = createAndStorePdf(sessionId, llmResult, Collections.emptyList());

        return AiCheckRunResponse.builder()
                .sessionId(sessionId)
                .status("error")
                .storageKey(storageKey)
                .imageUrl(imageUrl)
                .qualityPass(false)
                .qualityScore(0.0)
                .qualityReasons(List.of(reason))
                .detections(Collections.emptyList())
                .summary(Collections.emptyMap())
                .llmResult(llmResult)
                .pdfUrl(pdfUrl)
                .rag(toRagSummary(contexts))
                .build();
    }

    private AiCheckRunResponse quickErrorResponse(String sessionId, String storageKey, String imageUrl, String reason) {
        return AiCheckRunResponse.builder()
                .sessionId(sessionId)
                .status("error")
                .storageKey(storageKey)
                .imageUrl(imageUrl)
                .qualityPass(false)
                .qualityScore(0.0)
                .qualityReasons(List.of(reason))
                .detections(Collections.emptyList())
                .summary(Collections.emptyMap())
                .build();
    }

    private AnalyzeResponse analyzeErrorResponse(String sessionId, String reason) {
        AnalyzeResponse fallback = analyzeFallbackResponse(sessionId);
        return AnalyzeResponse.builder()
                .sessionId(sessionId)
                .status("error:" + reason)
                .detections(fallback.getDetections())
                .rag(fallback.getRag())
                .llmResult(fallback.getLlmResult())
                .build();
    }

    private AnalyzeResponse analyzeFallbackResponse(String sessionId) {
        MilvusRagService.RagSearchResult ragResult = milvusRagService.search("Dental screening fallback context", 8);
        List<AnalyzeResponse.RagSource> ragSources = toAnalyzeRagSources(ragResult.getContexts());
        AnalyzeResponse.LlmResult llmResult = aiAnalyzeLlmService.generate(List.of(), Map.of(), ragSources);

        return AnalyzeResponse.builder()
                .sessionId(sessionId)
                .status("done")
                .detections(List.of())
                .rag(AnalyzeResponse.RagSummary.builder()
                        .topK(8)
                        .sources(ragSources)
                        .usedFallback(true)
                        .build())
                .llmResult(llmResult)
                .build();
    }

    private List<AnalyzeResponse.DetectionItem> toAnalyzeDetections(List<AiCheckRunResponse.DetectionItem> detections) {
        return detections.stream()
                .map(v -> AnalyzeResponse.DetectionItem.builder()
                        .label(v.getLabel())
                        .confidence(v.getConfidence())
                        .bbox(AnalyzeResponse.BBox.builder()
                                .x(v.getBbox() == null ? 0.0 : v.getBbox().getX())
                                .y(v.getBbox() == null ? 0.0 : v.getBbox().getY())
                                .w(v.getBbox() == null ? 0.0 : v.getBbox().getW())
                                .h(v.getBbox() == null ? 0.0 : v.getBbox().getH())
                                .build())
                        .build())
                .toList();
    }

    private List<AnalyzeResponse.RagSource> toAnalyzeRagSources(List<MilvusRagService.RagContext> contexts) {
        return contexts.stream()
                .map(v -> AnalyzeResponse.RagSource.builder()
                        .source(v.getSource())
                        .score(v.getScore())
                        .snippet(trimSnippet(v.getText()))
                        .build())
                .toList();
    }

    private String trimSnippet(String text) {
        if (text == null) {
            return "";
        }
        String flat = text.replace('\n', ' ').trim();
        return flat.length() <= 200 ? flat : flat.substring(0, 200);
    }

    private String buildQueryFromDetections(List<AiCheckRunResponse.DetectionItem> detections, Map<String, Object> summary) {
        Map<String, Integer> grouped = new LinkedHashMap<>();
        for (AiCheckRunResponse.DetectionItem d : detections) {
            String label = d.getLabel() == null ? "normal" : d.getLabel();
            grouped.put(label, grouped.getOrDefault(label, 0) + 1);
        }
        String summaryText = summary == null || summary.isEmpty() ? "{}" : summary.toString();
        return "Detected findings: " + grouped + ". Detection summary: " + summaryText
                + ". Provide clinical explanation, risk level, care guide, and evidence-based citations.";
    }

    private RestTemplate aiRestTemplate() {
        org.springframework.http.client.SimpleClientHttpRequestFactory factory =
                new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(aiClientTimeoutMs);
        factory.setReadTimeout(aiClientTimeoutMs);
        return new RestTemplate(factory);
    }
}
