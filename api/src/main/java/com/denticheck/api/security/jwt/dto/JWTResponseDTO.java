package com.denticheck.api.security.jwt.dto;

import com.denticheck.api.domain.user.dto.UserResponseDTO;

public record JWTResponseDTO(String accessToken, String refreshToken, UserResponseDTO user) {
}
