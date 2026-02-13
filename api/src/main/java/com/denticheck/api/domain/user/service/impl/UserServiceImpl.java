package com.denticheck.api.domain.user.service.impl;

import com.denticheck.api.domain.user.dto.UserRequestDTO;
import com.denticheck.api.domain.user.dto.UserResponseDTO;
import com.denticheck.api.domain.user.entity.RoleEntity;
import com.denticheck.api.domain.user.entity.SocialProviderType;
import com.denticheck.api.domain.user.entity.UserEntity;
import com.denticheck.api.domain.user.entity.UserRoleType;
import com.denticheck.api.domain.user.entity.UserStatusType;
import com.denticheck.api.domain.user.repository.RoleRepository;
import com.denticheck.api.domain.user.repository.UserRepository;
import com.denticheck.api.domain.user.service.UserService;
import com.denticheck.api.security.jwt.service.impl.JwtServiceImpl;
import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.AccessDeniedException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final JwtServiceImpl jwtServiceImpl;
    private final RoleRepository roleRepository;

    // 회원 정보 수정
    @Transactional
    @Override
    public UUID updateUser(UserRequestDTO dto) throws AccessDeniedException {
        // 본인만 수정 가능 검증
        String sessionUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        if (!sessionUsername.equals(dto.getUsername())) {
            throw new AccessDeniedException("본인 계정만 수정 가능");
        }

        // 조회
        UserEntity entity = userRepository.findByUsername(dto.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException(dto.getUsername()));

        // 회원 정보 수정
        entity.updateUser(dto);

        return userRepository.save(entity).getId();
    }

    // 소셜 로그인 회원 탈퇴
    @Transactional
    @Override
    public void deleteUser(UserRequestDTO dto) throws AccessDeniedException {
        // 본인 및 어드민만 삭제 가능 검증
        SecurityContext context = SecurityContextHolder.getContext();
        String sessionUsername = context.getAuthentication().getName();
        String sessionRole = context.getAuthentication().getAuthorities().iterator().next().getAuthority();

        boolean isOwner = sessionUsername.equals(dto.getUsername());
        boolean isAdmin = sessionRole.equals("ROLE_" + UserRoleType.ADMIN.name());

        if (!isOwner && !isAdmin) {
            throw new AccessDeniedException("본인 혹은 관리자만 삭제할 수 있습니다.");
        }

        // 유저 제거
        userRepository.deleteByUsername(dto.getUsername());

        // Refresh 토큰 제거
        jwtServiceImpl.removeRefreshUser(dto.getUsername());
    }

    @Transactional(readOnly = true)
    @Override
    public UserResponseDTO readUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();

        UserEntity entity = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("해당 유저를 찾을 수 없습니다: " + username));

        return UserResponseDTO.builder()
                .nickname(entity.getNickname())
                .email(entity.getEmail())
                .profileImage(entity.getProfileImage())
                .build();
    }

    // 소셜 유저 정보 조회
    @Transactional(readOnly = true)
    @Override
    public Optional<UserEntity> findUser(String username) {
        return userRepository.findByUsername(username);
    }

    @Override
    public Boolean existsUser(String username) {
        return userRepository.existsByUsername(username);
    }

    @Value("${app.auth.admin-emails}")
    private List<String> adminEmails;

    @Transactional
    public UserEntity getOrCreateUser(SocialProviderType providerType, String providerId, String email,
            String nickname, String profileImage) {
        String username = providerType.name() + "_" + providerId;

        return userRepository.findWithRoleByUsername(username)
                .map(entity -> {
                    // 기존 유저 정보 업데이트
                    UserRequestDTO dto = new UserRequestDTO();
                    dto.setEmail(email);
                    dto.setNickname(nickname);
                    dto.setProfileImage(profileImage);
                    entity.updateUser(dto);
                    return entity;
                })
                .orElseGet(() -> {
                    // 신규 유저 생성
                    String roleName;
                    if (email != null && adminEmails != null && adminEmails.contains(email)) {
                        roleName = UserRoleType.ADMIN.name();
                    } else {
                        roleName = UserRoleType.USER.name();
                    }

                    String finalRoleName = roleName;
                    RoleEntity role = roleRepository.findByName(finalRoleName)
                            .orElseThrow(() -> new RuntimeException("Role not found: " + finalRoleName));

                    UserEntity newUser = UserEntity.builder()
                            .username(username)
                            .userStatusType(UserStatusType.ACTIVE)
                            .socialProviderType(providerType)
                            .nickname(nickname)
                            .email(email)
                            .profileImage(profileImage)
                            .role(role)
                            .build();

                    return userRepository.save(newUser);
                });
    }
}
