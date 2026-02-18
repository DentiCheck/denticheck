package com.denticheck.api.domain.community.repository;

import com.denticheck.api.domain.community.entity.CommunityCommentDentalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface CommunityCommentDentalRepository extends JpaRepository<CommunityCommentDentalEntity, UUID> {

    /** 댓글의 기존 병원 태그 링크를 DB에서 삭제 */
    @Modifying
    @Query("DELETE FROM CommunityCommentDentalEntity e WHERE e.commentId = :commentId")
    void deleteByCommentId(@Param("commentId") UUID commentId);
}
