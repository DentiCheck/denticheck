package com.denticheck.api.security.user.service.impl;

import com.denticheck.api.config.GoogleMobileProperties;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MobileIdTokenVerifierService {

    private final JwtDecoder idTokenDecoder;
    private final List<String> allowedAudiences;

    public MobileIdTokenVerifierService(JwtDecoder idTokenDecoder, GoogleMobileProperties props) {
        this.idTokenDecoder = idTokenDecoder;
        this.allowedAudiences = props.getAllowedAudiences();

        // TODO: 운영전환시 삭제(또는 유지하되 메시지만 개선)
        if (allowedAudiences == null || allowedAudiences.isEmpty()) {
            throw new IllegalStateException("google.mobile.allowed-audiences 설정이 필요합니다.");
        }
    }

    public Jwt verify(String idToken) {
        Jwt jwt = idTokenDecoder.decode(idToken); // 서명/iss/exp 등 기본 검증

        // aud 검증 (RN Android/iOS client id가 다르면 둘 다 허용 리스트로)
        List<String> aud = jwt.getAudience();
        boolean ok = aud != null && aud.stream().anyMatch(allowedAudiences::contains);
        if (!ok) {
            throw new IllegalArgumentException("지원되지 않는 Google idToken audience(클라이언트 ID)입니다.");
        }

        return jwt;
    }

}
