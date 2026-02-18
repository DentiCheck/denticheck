package com.denticheck.api.domain.community.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

/** GraphQL Comment 타입 및 API 응답용 댓글 DTO */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommunityCommentDto {

    private UUID id;
    private String author;
    private String content;
    /** 이미지 URL 목록 (최대 1장) */
    private List<String> images;
    /** 태그 목록 (병원/상품) */
    private List<CommunityPostDto.PostTagDto> tags;
    /** ISO-8601 문자열 */
    private String createdAt;
    private Integer likes;
    private Boolean isLiked;
    private Boolean isMine;
    /** 답글 개수 (최상위 댓글만 의미 있음) */
    private Integer replyCount;
}
