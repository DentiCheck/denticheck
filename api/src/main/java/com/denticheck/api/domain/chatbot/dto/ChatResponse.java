package com.denticheck.api.domain.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.denticheck.api.domain.chatbot.entity.ChatMessageType;
import com.denticheck.api.domain.chatbot.entity.ChatRole;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatResponse {
    private UUID id;
    private UUID sessionId;
    private ChatRole role;
    private ChatMessageType messageType;
    private String content;
    private String language;
    private Map<String, Object> citation;
    private Map<String, Object> payload;
    private LocalDateTime createdDate;
    private LocalDateTime updatedDate;
}
