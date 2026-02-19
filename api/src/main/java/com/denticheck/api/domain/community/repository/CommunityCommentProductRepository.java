package com.denticheck.api.domain.community.repository;

import com.denticheck.api.domain.community.entity.CommunityCommentProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CommunityCommentProductRepository extends JpaRepository<CommunityCommentProductEntity, UUID> {

    @Modifying
    @Query("DELETE FROM CommunityCommentProductEntity e WHERE e.commentId = :commentId")
    void deleteByCommentId(@Param("commentId") UUID commentId);

    /** 댓글 ID 목록으로 product 링크 + product 엔티티 함께 로드 */
    @Query("SELECT pl FROM CommunityCommentProductEntity pl JOIN FETCH pl.product WHERE pl.commentId IN :commentIds")
    List<CommunityCommentProductEntity> findByCommentIdInWithProduct(@Param("commentIds") List<UUID> commentIds);
}
