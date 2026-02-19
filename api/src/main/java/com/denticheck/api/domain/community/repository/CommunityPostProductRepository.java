package com.denticheck.api.domain.community.repository;

import com.denticheck.api.domain.community.entity.CommunityPostProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface CommunityPostProductRepository extends JpaRepository<CommunityPostProductEntity, UUID> {
    /** 게시글의 기존 상품 태그 링크를 DB에서 삭제 (clearAutomatically=false로 두어 post 엔티티가 detach되지 않도록 함) */
    @Modifying
    @Query("DELETE FROM CommunityPostProductEntity e WHERE e.postId = :postId")
    void deleteByPostId(@Param("postId") UUID postId);
}
