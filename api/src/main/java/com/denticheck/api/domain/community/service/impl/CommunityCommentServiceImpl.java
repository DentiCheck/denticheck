package com.denticheck.api.domain.community.service.impl;

import com.denticheck.api.domain.community.entity.CommunityCommentEntity;
import com.denticheck.api.domain.community.entity.CommunityCommentLikeEntity;
import com.denticheck.api.domain.community.repository.CommunityCommentLikeRepository;
import com.denticheck.api.domain.community.repository.CommunityCommentRepository;
import com.denticheck.api.domain.community.service.CommunityCommentService;
import com.denticheck.api.domain.community.service.CommentLikeToggleResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CommunityCommentServiceImpl implements CommunityCommentService {

    private final CommunityCommentRepository communityCommentRepository;
    private final CommunityCommentLikeRepository communityCommentLikeRepository;

    @Override
    @Transactional
    public CommentLikeToggleResult toggleCommentLike(UUID userId, UUID commentId) {
        CommunityCommentEntity comment = communityCommentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다."));
        boolean wasLiked = communityCommentLikeRepository.existsByUserIdAndCommentId(userId, commentId);
        if (wasLiked) {
            communityCommentLikeRepository.deleteByUserIdAndCommentId(userId, commentId);
            comment.setLikeCount(Math.max(0, (comment.getLikeCount() == null ? 0 : comment.getLikeCount()) - 1));
        } else {
            communityCommentLikeRepository.save(CommunityCommentLikeEntity.builder()
                    .userId(userId)
                    .commentId(commentId)
                    .build());
            comment.setLikeCount((comment.getLikeCount() == null ? 0 : comment.getLikeCount()) + 1);
        }
        comment = communityCommentRepository.save(comment);
        return new CommentLikeToggleResult(comment, !wasLiked);
    }
}
