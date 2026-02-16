package com.denticheck.api.graphql.resolver;

import com.denticheck.api.common.util.UserRoleOnly;
import com.denticheck.api.domain.chatbot.dto.ChatAppRequest;
import com.denticheck.api.domain.chatbot.dto.ChatAppResponse;
import com.denticheck.api.domain.chatbot.dto.ChatSessionResponse;
import com.denticheck.api.domain.chatbot.dto.ChatResponse;
import com.denticheck.api.domain.chatbot.entity.ChatSessionEntity;
import com.denticheck.api.domain.chatbot.service.impl.ChatServiceImpl;
import com.denticheck.api.domain.user.entity.UserEntity;
import com.denticheck.api.domain.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Controller
@UserRoleOnly
@RequiredArgsConstructor
public class ChatResolver {

        private final ChatServiceImpl chatServiceImpl;
        private final UserRepository userRepository;

        @MutationMapping
        @PreAuthorize("hasRole('USER')")
        public ChatSessionResponse startChatSession(@Argument("channel") String channel) {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                UserEntity user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("해당 사용자를 찾을 수 없습니다: " + username));

                ChatSessionEntity session = chatServiceImpl.startSession(user.getId(), channel);
                return ChatSessionResponse.builder()
                                .id(session.getId())
                                .channel(session.getChannel())
                                .createdDate(session.getCreatedAt())
                                .updatedDate(session.getUpdatedAt())
                                .build();
        }

        @QueryMapping
        @PreAuthorize("hasRole('USER')")
        public List<ChatResponse> getChatHistory(@Argument("sessionId") UUID sessionId) {
                return chatServiceImpl.getChatHistory(sessionId).stream()
                                .map(entity -> ChatResponse.builder()
                                                .id(entity.getId())
                                                .sessionId(entity.getSession().getId())
                                                .role(entity.getRole())
                                                .content(entity.getContent())
                                                .messageType(entity.getMessageType())
                                                .payload(entity.getPayload())
                                                .language(entity.getLanguage())
                                                .citation(entity.getCitation())
                                                .createdDate(entity.getCreatedAt())
                                                .updatedDate(entity.getUpdatedAt())
                                                .build())
                                .collect(Collectors.toList());
        }

        @MutationMapping
        @PreAuthorize("hasRole('USER')")
        public ChatAppResponse sendChatMessage(
                        @Argument("request") ChatAppRequest request,
                        @Argument("channel") String channel) {

                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                UserEntity user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("해당 사용자를 찾을 수 없습니다: " + username));

                return chatServiceImpl.processMessage(request, user.getId(), channel);
        }

        @MutationMapping
        @PreAuthorize("hasRole('USER')")
        public Boolean endChatSession(@Argument("channel") String channel) {
                String username = SecurityContextHolder.getContext().getAuthentication().getName();
                UserEntity user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new RuntimeException("해당 사용자를 찾을 수 없습니다: " + username));

                chatServiceImpl.endSession(user.getId(), channel);
                return true;
        }
}
