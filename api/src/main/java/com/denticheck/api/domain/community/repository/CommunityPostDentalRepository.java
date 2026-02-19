package com.denticheck.api.domain.community.repository;

import com.denticheck.api.domain.community.entity.CommunityPostDentalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface CommunityPostDentalRepository extends JpaRepository<CommunityPostDentalEntity, UUID> {
    /** 게시글의 기존 병원 태그 링크를 DB에서 삭제 (clearAutomatically=false로 두어 post 엔티티가 detach되지 않도록 함) */
    @Modifying
    @Query("DELETE FROM CommunityPostDentalEntity e WHERE e.postId = :postId")
    void deleteByPostId(@Param("postId") UUID postId);
}
