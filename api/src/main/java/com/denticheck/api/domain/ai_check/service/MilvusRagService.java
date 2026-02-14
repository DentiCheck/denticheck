package com.denticheck.api.domain.ai_check.service;

import com.denticheck.api.domain.ai_check.dto.AiCheckRunResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MilvusRagService {

    @Getter
    @Builder
    public static class RagContext {
        private String text;
        private String source;
        private Double score;
    }

    @Getter
    @Builder
    public static class RagSearchResult {
        private List<RagContext> contexts;
        private boolean usedFallback;
        private int topK;
    }

    private final ObjectMapper objectMapper;

    @Value("${milvus.enabled:false}")
    private boolean milvusEnabled;

    @Value("${milvus.search.url:http://localhost:9091/v2/vectordb/entities/search}")
    private String milvusSearchUrl;

    @Value("${milvus.collection:dental_knowledge}")
    private String milvusCollection;

    @Value("${milvus.vector.field:embedding}")
    private String milvusVectorField;

    @Value("${milvus.output.fields:text,source,tags}")
    private String milvusOutputFields;

    @Value("${milvus.top-k:8}")
    private int topK;

    @Value("${ollama.base-url:http://localhost:11434}")
    private String ollamaBaseUrl;

    @Value("${ollama.embedding.model:nomic-embed-text}")
    private String embeddingModel;

    @Value("${milvus.timeout-ms:3000}")
    private int milvusTimeoutMs;

    @Value("${ollama.embedding.timeout-ms:3000}")
    private int embeddingTimeoutMs;

    public List<RagContext> retrieveContexts(List<AiCheckRunResponse.DetectionItem> detections) {
        List<String> labels = detections == null ? List.of() : detections.stream()
                .map(AiCheckRunResponse.DetectionItem::getLabel)
                .filter(Objects::nonNull)
                .map(v -> v.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();

        String query = buildQuery(labels, detections == null ? 0 : detections.size());
        return search(query, topK, labels).getContexts();
    }

    public RagSearchResult search(String query, int requestedTopK) {
        return search(query, requestedTopK, List.of());
    }

    private RagSearchResult search(String query, int requestedTopK, List<String> knownLabels) {
        int safeTopK = requestedTopK > 0 ? requestedTopK : topK;
        long startedAt = System.currentTimeMillis();

        List<String> labels = knownLabels == null || knownLabels.isEmpty()
                ? inferLabelsFromQuery(query)
                : knownLabels;

        if (!milvusEnabled) {
            log.info("Milvus search skipped (disabled). Using fallback contexts");
            return RagSearchResult.builder()
                    .contexts(fallbackContexts(labels))
                    .usedFallback(true)
                    .topK(safeTopK)
                    .build();
        }

        try {
            List<Double> embedding = createEmbedding(query);
            if (embedding.isEmpty()) {
                log.warn("Milvus search fallback: empty embedding generated");
                return RagSearchResult.builder()
                        .contexts(fallbackContexts(labels))
                        .usedFallback(true)
                        .topK(safeTopK)
                        .build();
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("collectionName", milvusCollection);
            body.put("data", List.of(embedding));
            body.put("annsField", milvusVectorField);
            body.put("limit", safeTopK);
            body.put("outputFields", parseOutputFields());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<Map> response = milvusRestTemplate().postForEntity(
                    milvusSearchUrl,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            List<RagContext> contexts = parseMilvusResponse(response.getBody());
            if (contexts.isEmpty()) {
                log.warn("Milvus search returned empty contexts. Using fallback");
                return RagSearchResult.builder()
                        .contexts(fallbackContexts(labels))
                        .usedFallback(true)
                        .topK(safeTopK)
                        .build();
            }
            long elapsed = System.currentTimeMillis() - startedAt;
            log.info("Milvus search success: {} contexts in {}ms", contexts.size(), elapsed);
            return RagSearchResult.builder()
                    .contexts(contexts)
                    .usedFallback(false)
                    .topK(safeTopK)
                    .build();
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - startedAt;
            log.warn("Milvus search failed in {}ms. Fallback contexts will be used", elapsed, e);
            return RagSearchResult.builder()
                    .contexts(fallbackContexts(labels))
                    .usedFallback(true)
                    .topK(safeTopK)
                    .build();
        }
    }

    public int getTopK() {
        return topK;
    }

    private List<Double> createEmbedding(String query) {
        String url = ollamaBaseUrl + "/api/embeddings";
        Map<String, Object> body = Map.of(
                "model", embeddingModel,
                "prompt", query
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<Map> response = embeddingRestTemplate().postForEntity(url, new HttpEntity<>(body, headers), Map.class);
        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null) {
            return List.of();
        }

        Object embedding = responseBody.get("embedding");
        if (!(embedding instanceof List<?> raw)) {
            return List.of();
        }

        List<Double> out = new ArrayList<>();
        for (Object v : raw) {
            if (v instanceof Number n) {
                out.add(n.doubleValue());
            }
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private List<RagContext> parseMilvusResponse(Map<String, Object> body) {
        if (body == null) {
            return List.of();
        }

        Object dataObj = body.get("data");
        if (!(dataObj instanceof List<?> rows)) {
            return List.of();
        }

        List<RagContext> out = new ArrayList<>();
        for (Object row : rows) {
            if (!(row instanceof Map<?, ?> map)) {
                continue;
            }

            String text = Objects.toString(map.get("text"), "").trim();
            if (text.isBlank()) {
                continue;
            }

            String source = Objects.toString(map.get("source"), "milvus");
            double score = asDouble(map.get("score"));
            out.add(RagContext.builder()
                    .text(text)
                    .source(source)
                    .score(score)
                    .build());
        }

        if (out.isEmpty()) {
            // Some Milvus responses wrap fields under "entity"
            for (Object row : rows) {
                if (!(row instanceof Map<?, ?> map)) {
                    continue;
                }
                Object entityObj = map.get("entity");
                if (!(entityObj instanceof Map<?, ?> entity)) {
                    continue;
                }
                String text = Objects.toString(entity.get("text"), "").trim();
                if (text.isBlank()) {
                    continue;
                }
                String source = Objects.toString(entity.get("source"), "milvus");
                double score = asDouble(map.get("score"));
                out.add(RagContext.builder()
                        .text(text)
                        .source(source)
                        .score(score)
                        .build());
            }
        }
        return out;
    }

    private List<String> parseOutputFields() {
        return List.of(milvusOutputFields.split(","))
                .stream()
                .map(String::trim)
                .filter(v -> !v.isBlank())
                .collect(Collectors.toList());
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

    private String buildQuery(List<String> labels, int detectionCount) {
        String labelText = labels.isEmpty() ? "normal" : String.join(",", labels);
        return "Dental screening findings labels=" + labelText + ", detectionCount=" + detectionCount
                + ". Return patient guidance and risk explanations.";
    }

    private List<RagContext> fallbackContexts(List<String> labels) {
        List<RagContext> contexts = new ArrayList<>();

        contexts.add(RagContext.builder()
                .source("dental-guideline-general")
                .score(1.0)
                .text("AI screening is not a medical diagnosis. Persistent pain, bleeding, ulcer, or swelling needs clinical evaluation.")
                .build());

        if (labels.contains("oral_cancer")) {
            contexts.add(RagContext.builder()
                    .source("dental-guideline-oral-cancer")
                    .score(0.9)
                    .text("If oral lesion is suspected, early in-person dental or oral medicine consultation is strongly recommended.")
                    .build());
        }
        if (labels.contains("caries")) {
            contexts.add(RagContext.builder()
                    .source("dental-guideline-caries")
                    .score(0.85)
                    .text("Suspected caries should be assessed with direct oral exam and radiographic evaluation when appropriate.")
                    .build());
        }
        if (labels.contains("tartar")) {
            contexts.add(RagContext.builder()
                    .source("dental-guideline-tartar")
                    .score(0.82)
                    .text("Scaling and daily interdental cleaning are commonly recommended for tartar or plaque accumulation.")
                    .build());
        }

        return contexts;
    }

    private RestTemplate milvusRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(milvusTimeoutMs);
        factory.setReadTimeout(milvusTimeoutMs);
        return new RestTemplate(factory);
    }

    private RestTemplate embeddingRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(embeddingTimeoutMs);
        factory.setReadTimeout(embeddingTimeoutMs);
        return new RestTemplate(factory);
    }

    private List<String> inferLabelsFromQuery(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        String lower = query.toLowerCase(Locale.ROOT);
        List<String> labels = new ArrayList<>();
        if (lower.contains("caries")) labels.add("caries");
        if (lower.contains("tartar") || lower.contains("calculus") || lower.contains("plaque")) labels.add("tartar");
        if (lower.contains("oral_cancer") || lower.contains("oral cancer")) labels.add("oral_cancer");
        if (labels.isEmpty()) labels.add("normal");
        return labels;
    }
}
