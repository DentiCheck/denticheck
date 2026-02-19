package com.denticheck.api.domain.community.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/**
 * GraphQL 및 API 응답용 커뮤니티 게시글 DTO.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityPostDto {

    private UUID id;
    private String author;
    private String authorInitial;
    private String content;
    /** 이미지 URL 목록 (표시 순서대로) */
    private List<String> images;
    private List<PostTagDto> tags;
    private Integer likes;
    private Integer comments;
    /** ISO-8601 문자열 (GraphQL String 타입과 일치) */
    private String createdAt;
    /** 게시글 종류: "product"(상품후기), "hospital"(병원후기), null(전체/일반) */
    private String postType;
    /** 현재 로그인 사용자 본인 글이면 true (삭제 버튼 노출용) */
    private Boolean isMine;
    /** 현재 로그인 사용자가 좋아요 눌렀으면 true */
    private Boolean isLiked;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PostTagDto {
        private String type; // "product" | "hospital"
        private String name;
        private String id; // 병원(UUID 문자열) 또는 상품(Long 문자열) ID
    }
}
