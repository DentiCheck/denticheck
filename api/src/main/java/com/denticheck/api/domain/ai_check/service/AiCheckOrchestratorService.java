package com.denticheck.api.domain.ai_check.service;

import com.denticheck.api.domain.ai_check.dto.AiCheckRunResponse;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class AiCheckOrchestratorService {

    private static final List<String> ALLOWED_EXTENSIONS = List.of(".jpg", ".jpeg", ".png", ".webp");

    @Value("${ai.client.url}")
    private String aiBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final MilvusRagService milvusRagService;
    private final AiLlmResultService aiLlmResultService;
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
        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);
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
}
