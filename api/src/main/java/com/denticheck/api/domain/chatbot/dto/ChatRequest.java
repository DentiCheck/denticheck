package com.denticheck.api.domain.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.denticheck.api.domain.chatbot.entity.ChatMessageType;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRequest {
    private UUID sessionId;
    private String content;
    private ChatMessageType messageType;
    private Map<String, Object> payload;
    private String language;
}
