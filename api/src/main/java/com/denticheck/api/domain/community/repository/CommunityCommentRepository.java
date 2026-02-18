package com.denticheck.api.domain.community.repository;

import com.denticheck.api.domain.community.entity.CommunityCommentEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CommunityCommentRepository extends JpaRepository<CommunityCommentEntity, UUID> {

    /** 게시글별 댓글 목록 (작성일 기준 정렬, 페이징) */
    List<CommunityCommentEntity> findByPost_IdOrderByCreatedAtAsc(UUID postId, Pageable pageable);

    /** 페이징용: 최상위 댓글 ID 목록만 조회 (답글 제외, 최신순) */
    @Query("SELECT c.id FROM CommunityCommentEntity c WHERE c.post.id = :postId AND c.parentComment IS NULL ORDER BY c.createdAt DESC")
    List<UUID> findIdsByPostIdOrderByCreatedAtDesc(@Param("postId") UUID postId, Pageable pageable);

    /** 부모 댓글별 답글 수 */
    long countByParentComment_Id(UUID parentCommentId);

    /** 부모 댓글별 답글 ID만 작성일 오름차순으로 조회 (중복 없음) */
    @Query("SELECT c.id FROM CommunityCommentEntity c WHERE c.parentComment.id = :parentCommentId ORDER BY c.createdAt ASC")
    List<UUID> findIdsByParentComment_IdOrderByCreatedAtAsc(@Param("parentCommentId") UUID parentCommentId);

    /** 댓글 ID 목록으로 dentalLinks(dental 포함)까지 함께 로드 */
    @Query("SELECT DISTINCT c FROM CommunityCommentEntity c LEFT JOIN FETCH c.dentalLinks d LEFT JOIN FETCH d.dental WHERE c.id IN :ids")
    List<CommunityCommentEntity> findAllWithDentalsByIdIn(@Param("ids") List<UUID> ids);

    /** 단일 댓글을 dentalLinks(dental 포함)까지 함께 로드 */
    @Query("SELECT c FROM CommunityCommentEntity c LEFT JOIN FETCH c.dentalLinks d LEFT JOIN FETCH d.dental WHERE c.id = :id")
    Optional<CommunityCommentEntity> findByIdWithDentals(@Param("id") UUID id);
}
