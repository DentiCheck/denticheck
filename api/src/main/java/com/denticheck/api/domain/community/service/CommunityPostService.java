package com.denticheck.api.domain.community.service;

import com.denticheck.api.domain.community.dto.CommunityPostDto;
import com.denticheck.api.domain.community.dto.PostLikeResultDto;

import java.util.List;

public interface CommunityPostService {
    List<CommunityPostDto> findAll();

    /** 최신순 페이징 (limit 기본 10, offset 0). postType null이면 전체, "product"|"hospital"이면 해당만 */
    List<CommunityPostDto> findAll(int limit, int offset, String postType);

    /** 단일 게시글 조회 (공유 링크 등). 없으면 empty */
    java.util.Optional<CommunityPostDto> findById(java.util.UUID postId);

    CommunityPostDto create(String authorName, String content, String postType, List<java.util.UUID> dentalIds, List<String> imageUrls);

    /** 작성자일 때만 삭제, 아니면 AccessDeniedException */
    void deleteIfAuthor(java.util.UUID postId, String authorName);

    /** 좋아요 토글, 로그인 사용자만. 반환: 토글 후 isLiked, likeCount */
    PostLikeResultDto toggleLike(java.util.UUID userId, java.util.UUID postId);
}
