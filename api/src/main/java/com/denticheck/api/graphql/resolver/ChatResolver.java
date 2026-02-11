package com.denticheck.api.graphql.resolver;

import com.denticheck.api.domain.chatbot.entity.AiChatMessageEntity;
import com.denticheck.api.domain.chatbot.entity.ChatSessionEntity;
import com.denticheck.api.domain.chatbot.service.ChatService;
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

@Controller
@RequiredArgsConstructor
public class ChatResolver {

    private final ChatService chatService;

    private final UserRepository userRepository;

    @MutationMapping
    @PreAuthorize("hasRole('USER')")
    public ChatSessionEntity startChatSession(@Argument("channel") String channel) {
        // ... (existing code)
        // ...
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        // ...
        com.denticheck.api.domain.user.entity.UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        return chatService.startSession(user.getId(), channel);
    }

    @QueryMapping
    @PreAuthorize("hasRole('USER')")
    public List<AiChatMessageEntity> getChatHistory(@Argument("sessionId") UUID sessionId) {
        return chatService.getChatHistory(sessionId);
    }

    @MutationMapping
    @PreAuthorize("hasRole('USER')")
    public AiChatMessageEntity sendChatMessage(@Argument("sessionId") UUID sessionId,
            @Argument("content") String content,
            @Argument("language") String language) {
        return chatService.processMessage(sessionId, content, language);
    }
}
