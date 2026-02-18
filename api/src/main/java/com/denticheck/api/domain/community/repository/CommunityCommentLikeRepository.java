package com.denticheck.api.domain.community.repository;

import com.denticheck.api.domain.community.entity.CommunityCommentLikeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CommunityCommentLikeRepository extends JpaRepository<CommunityCommentLikeEntity, UUID> {

    boolean existsByUserIdAndCommentId(UUID userId, UUID commentId);

    void deleteByUserIdAndCommentId(UUID userId, UUID commentId);

    /** 현재 사용자가 좋아요한 댓글 ID 목록 (comments 조회 시 isLiked 설정용) */
    List<CommunityCommentLikeEntity> findByUserIdAndCommentIdIn(UUID userId, List<UUID> commentIds);
}
