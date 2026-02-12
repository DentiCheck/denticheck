package com.denticheck.api.domain.ai_check.service;

import com.denticheck.api.domain.ai_check.dto.AiCheckRunResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
import lombok.Getter;
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

    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate = new RestTemplate();

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

    public List<RagContext> retrieveContexts(List<AiCheckRunResponse.DetectionItem> detections) {
        List<String> labels = detections == null ? List.of() : detections.stream()
                .map(AiCheckRunResponse.DetectionItem::getLabel)
                .filter(Objects::nonNull)
                .map(v -> v.toLowerCase(Locale.ROOT))
                .distinct()
                .toList();

        String query = buildQuery(labels, detections == null ? 0 : detections.size());

        if (!milvusEnabled) {
            return fallbackContexts(labels);
        }

        try {
            List<Double> embedding = createEmbedding(query);
            if (embedding.isEmpty()) {
                return fallbackContexts(labels);
            }

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("collectionName", milvusCollection);
            body.put("data", List.of(embedding));
            body.put("annsField", milvusVectorField);
            body.put("limit", topK);
            body.put("outputFields", parseOutputFields());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            ResponseEntity<Map> response = restTemplate.postForEntity(
                    milvusSearchUrl,
                    new HttpEntity<>(body, headers),
                    Map.class
            );

            List<RagContext> contexts = parseMilvusResponse(response.getBody());
            if (contexts.isEmpty()) {
                return fallbackContexts(labels);
            }
            return contexts;
        } catch (Exception e) {
            log.warn("Milvus retrieval failed. Fallback contexts will be used", e);
            return fallbackContexts(labels);
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

        ResponseEntity<Map> response = restTemplate.postForEntity(url, new HttpEntity<>(body, headers), Map.class);
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
}
