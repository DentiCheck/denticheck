package com.denticheck.api.domain.community.service;

import com.denticheck.api.domain.community.entity.CommunityCommentEntity;

/** 댓글 좋아요 토글 결과 (게시글 toggleLike와 동일 패턴) */
public record CommentLikeToggleResult(CommunityCommentEntity comment, boolean isLiked) {}
