package com.denticheck.api.domain.chatbot.dto;

import com.denticheck.api.domain.chatbot.entity.ChatMessageType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatAppResponse {
    private UUID sessionId;
    private UUID userMessageId;
    private UUID assistantMessageId;
    private String assistantContent;
    private ChatMessageType messageType;
    private Map<String, Object> payload;
}
