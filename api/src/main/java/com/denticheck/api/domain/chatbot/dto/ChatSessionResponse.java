package com.denticheck.api.domain.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatSessionResponse {
    private UUID id;
    private String channel;
    private LocalDateTime createdDate;
    private LocalDateTime updatedDate;
}
