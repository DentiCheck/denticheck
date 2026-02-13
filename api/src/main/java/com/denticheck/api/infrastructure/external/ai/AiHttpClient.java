package com.denticheck.api.infrastructure.external.ai;

import com.denticheck.api.infrastructure.external.ai.dto.AiChatAskRequest;
import com.denticheck.api.infrastructure.external.ai.dto.AiChatAskResponse;
import com.denticheck.api.infrastructure.external.ai.dto.AiQualityRequest;
import com.denticheck.api.infrastructure.external.ai.dto.AiQualityResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
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
        AiChatAskResponse response = restClient.post()
                .uri("/v1/chat/ask")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(AiChatAskResponse.class);

        log.debug("AI 응답: {}", response);

        return response != null ? response.getAnswer() : null;
    }
}
