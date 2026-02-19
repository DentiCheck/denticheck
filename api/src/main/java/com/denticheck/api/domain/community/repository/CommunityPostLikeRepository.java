package com.denticheck.api.domain.community.repository;

import com.denticheck.api.domain.community.entity.CommunityPostLikeEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CommunityPostLikeRepository extends JpaRepository<CommunityPostLikeEntity, UUID> {

    boolean existsByUserIdAndPostId(UUID userId, UUID postId);

    void deleteByUserIdAndPostId(UUID userId, UUID postId);

    /** 사용자가 좋아요한 게시글 like 목록 (posts 조회 시 isLiked 설정용) */
    List<CommunityPostLikeEntity> findByUserId(UUID userId);

    /** 사용자가 좋아요한 게시글 ID 목록 (게시글 작성일 최신순, 페이징) */
    @Query("SELECT l.post.id FROM CommunityPostLikeEntity l WHERE l.userId = :userId ORDER BY l.post.createdAt DESC")
    List<UUID> findPostIdsByUserIdOrderByPostCreatedAtDesc(@Param("userId") UUID userId, Pageable pageable);
}
