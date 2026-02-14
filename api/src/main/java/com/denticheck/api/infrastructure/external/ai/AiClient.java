package com.denticheck.api.infrastructure.external.ai;

import com.denticheck.api.infrastructure.external.ai.dto.AiChatAskRequest;
import com.denticheck.api.infrastructure.external.ai.dto.AiQualityRequest;
import com.denticheck.api.infrastructure.external.ai.dto.AiQualityResponse;

public interface AiClient {
    AiQualityResponse checkQuality(AiQualityRequest request);

    String askChat(AiChatAskRequest request);
}
