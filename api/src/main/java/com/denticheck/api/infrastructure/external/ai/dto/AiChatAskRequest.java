package com.denticheck.api.infrastructure.external.ai.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatAskRequest {
    private String content;
    private String language;
}
