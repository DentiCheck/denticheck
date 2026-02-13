package com.denticheck.api.domain.chatbot.dto;

import com.denticheck.api.domain.chatbot.entity.ChatMessageType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatAppRequest {
    private String content;
    private ChatMessageType messageType;
    private Map<String, Object> payload;
}
