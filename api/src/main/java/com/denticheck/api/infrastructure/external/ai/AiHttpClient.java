package com.denticheck.api.infrastructure.external.ai;

import com.denticheck.api.infrastructure.external.ai.dto.AiChatAskRequest;
import com.denticheck.api.infrastructure.external.ai.dto.AiChatAskResponse;
// import com.denticheck.api.infrastructure.external.ai.dto.AiChatAskResponse;
import com.denticheck.api.infrastructure.external.ai.dto.AiQualityRequest;
import com.denticheck.api.infrastructure.external.ai.dto.AiQualityResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
@Slf4j
public class AiHttpClient implements AiClient {

    private final RestClient restClient;

    public AiHttpClient(@Value("${ai.client.url}") String aiUrl, RestClient.Builder builder) {
        this.restClient = builder.baseUrl(aiUrl).build();
    }

    @Override
    public AiQualityResponse checkQuality(AiQualityRequest request) {
        log.info("AI 서비스의 checkQuality를 호출합니다. storageKey: {}", request.getStorageKey());
        return restClient.post()
                .uri("/v1/quality")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(AiQualityResponse.class);
    }

    @Override
    public String askChat(AiChatAskRequest request) {
        log.info("AI 서비스의 askChat를 호출합니다. content: {}", request.getContent());
        ResponseEntity<AiChatAskResponse> entity = restClient.post()
                .uri("/v1/chat/ask")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toEntity(AiChatAskResponse.class); // ✅ raw로 받기

        log.info("AI status={}", entity.getStatusCode());
        log.info("AI content-type={}", entity.getHeaders().getContentType());
        log.info("AI raw body={}", entity.getBody().toString());

        // 일단은 raw를 그대로 반환하거나, 다음 단계에서 파싱
        return entity.getBody() != null ? entity.getBody().getAnswer() : null;
    }
}
