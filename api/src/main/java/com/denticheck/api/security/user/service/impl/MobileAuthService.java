package com.denticheck.api.security.user.service.impl;

import com.denticheck.api.common.util.JWTUtil;
import com.denticheck.api.domain.user.entity.SocialProviderType;
import com.denticheck.api.domain.user.entity.UserEntity;

import com.denticheck.api.domain.user.service.impl.UserServiceImpl;
import com.denticheck.api.security.jwt.dto.JWTResponseDTO;
import com.denticheck.api.security.jwt.service.impl.JwtServiceImpl;
import lombok.RequiredArgsConstructor;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import com.denticheck.api.common.exception.user.UserErrorCode;
import com.denticheck.api.common.exception.user.UserException;
import com.denticheck.api.domain.user.entity.UserStatusType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import com.denticheck.api.domain.user.dto.UserResponseDTO;

@Service
@Slf4j
@RequiredArgsConstructor
public class MobileAuthService {

        private final MobileIdTokenVerifierService googleVerifier;
        private final UserServiceImpl userServiceImpl;
        private final JwtServiceImpl jwtServiceImpl;
        private final JWTUtil jwtUtil;

        @Transactional
        public JWTResponseDTO googleLogin(String idToken) {
                log.debug("googleLogin() 실행");

                Jwt jwt = googleVerifier.verify(idToken);

                // Google 표준 claim
                String providerId = jwt.getSubject();
                String email = jwt.getClaimAsString("email");
                String nickname = jwt.getClaimAsString("name");
                String picture = jwt.getClaimAsString("picture");

                // 유저 조회/생성 (공통 로직 사용)
                UserEntity user = userServiceImpl.getOrCreateUser(
                                SocialProviderType.GOOGLE,
                                providerId,
                                email,
                                nickname,
                                picture);

                if (user.getUserStatusType() != UserStatusType.ACTIVE) {
                        if (user.getUserStatusType() == UserStatusType.SUSPENDED) {
                                throw new UserException(UserErrorCode.USER_SUSPENDED);
                        } else if (user.getUserStatusType() == UserStatusType.DORMANT) {
                                throw new UserException(UserErrorCode.USER_DORMANT);
                        } else if (user.getUserStatusType() == UserStatusType.WITHDRAWN) {
                                throw new UserException(UserErrorCode.USER_WITHDRAWN);
                        } else {
                                throw new UserException(UserErrorCode.USER_NOT_ACTIVE);
                        }
                }

                String roleName = user.getRole() != null ? user.getRole().getName() : "USER";
                String role = "ROLE_" + roleName;

                String accessToken = jwtUtil.createAccessJWT(user.getUsername(), role);
                String refreshToken = jwtUtil.createRefreshJWT(user.getUsername(), role);

                jwtServiceImpl.addRefresh(user.getUsername(), refreshToken);

                return new JWTResponseDTO(accessToken, refreshToken,
                                UserResponseDTO.builder()
                                                .nickname(user.getNickname())
                                                .email(user.getEmail())
                                                .profileImage(user.getProfileImage())
                                                .build());
        }
}
