package com.denticheck.api.domain.community.service;

import java.util.UUID;

/** 댓글 좋아요 토글 - 게시글 좋아요(CommunityPostService.toggleLike)와 동일 로직으로 서비스에서 @Transactional 처리 */
public interface CommunityCommentService {

    CommentLikeToggleResult toggleCommentLike(UUID userId, UUID commentId);
}
