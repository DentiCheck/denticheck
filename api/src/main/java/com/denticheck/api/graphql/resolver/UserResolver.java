package com.denticheck.api.graphql.resolver;

import com.denticheck.api.domain.user.dto.UserResponseDTO;
import com.denticheck.api.domain.user.service.impl.UserServiceImpl;

import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class UserResolver {

    private final UserServiceImpl userServiceImpl;

    @QueryMapping
    @PreAuthorize("hasRole('ADMIN')")
    public UserResponseDTO me() {
        return userServiceImpl.readUser();
    }
}
