package com.denticheck.api.domain.user.service.impl;

import com.denticheck.api.domain.user.dto.CustomOAuth2User;
import com.denticheck.api.domain.user.entity.SocialProviderType;
import com.denticheck.api.domain.user.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserServiceImpl extends DefaultOAuth2UserService {

    private final UserServiceImpl userServiceImpl;

    // 소셜 로그인 (매 로그인시 : 신규 = 가입, 기존 = 업데이트)
    @Override
    @SuppressWarnings("unchecked")
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {

        // 부모 메소드 호출
        OAuth2User oAuth2User = super.loadUser(userRequest);

        // 데이터
        Map<String, Object> attributes;
        String providerId;
        String email;
        String nickname;
        String profileImage;
        SocialProviderType providerType;

        // provider 제공자별 데이터 획득
        String registrationId = userRequest.getClientRegistration().getRegistrationId().toUpperCase();

        if (registrationId.equals(SocialProviderType.NAVER.name())) {
            providerType = SocialProviderType.NAVER;
            attributes = (Map<String, Object>) oAuth2User.getAttributes().get("response");
            providerId = attributes.get("id").toString();
            email = attributes.get("email").toString();
            nickname = attributes.get("nickname").toString();
            profileImage = attributes.get("profile_image").toString();

        } else if (registrationId.equals(SocialProviderType.GOOGLE.name())) {
            providerType = SocialProviderType.GOOGLE;
            attributes = (Map<String, Object>) oAuth2User.getAttributes();
            providerId = attributes.get("sub").toString();
            email = attributes.get("email").toString();
            nickname = attributes.get("name").toString();
            profileImage = attributes.get("picture").toString();

        } else {
            throw new OAuth2AuthenticationException("지원하지 않는 소셜 로그인입니다.");
        }

        // 공통 로직으로 유저 생성/조회 (Admin 권한 부여 포함)
        UserEntity user = userServiceImpl.getOrCreateUser(providerType, providerId, email, nickname, profileImage);

        String roleName = user.getRole() != null ? user.getRole().getName() : "USER";
        String role = "ROLE_" + roleName;
        String username = user.getUsername();

        List<GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority(role));

        return new CustomOAuth2User(attributes, authorities, username);
    }

}
