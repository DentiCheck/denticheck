package com.denticheck.api.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * 공유 링크 클릭 시 인증 없이 앱 딥링크로 리다이렉트.
 * 브라우저에는 앱 토큰이 없어 401이 나오므로, 웹 URL → 앱 스킴으로만 보내고
 * 로그인/게시글 표시는 앱 내부에서 처리.
 */
@RestController
@RequestMapping("/community/post")
public class CommunityShareRedirectController {

    private static final String APP_DEEP_LINK_SCHEME = "denticheck://community/post/";

    @GetMapping("/{postId}")
    public ResponseEntity<Void> redirectToApp(@PathVariable String postId) {
        try {
            UUID.fromString(postId);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
        String location = APP_DEEP_LINK_SCHEME + postId;
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, location)
                .build();
    }
}
