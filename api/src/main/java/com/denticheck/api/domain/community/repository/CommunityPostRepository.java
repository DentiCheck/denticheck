package com.denticheck.api.domain.community.repository;

import com.denticheck.api.domain.community.entity.CommunityPostEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CommunityPostRepository extends JpaRepository<CommunityPostEntity, UUID> {

    @Query("SELECT DISTINCT p FROM CommunityPostEntity p LEFT JOIN FETCH p.dentalLinks d LEFT JOIN FETCH d.dental")
    List<CommunityPostEntity> findAllWithDentals();

    @Query("SELECT p.id FROM CommunityPostEntity p ORDER BY p.createdAt DESC")
    List<UUID> findIdsOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT p.id FROM CommunityPostEntity p WHERE (:postType IS NULL OR p.postType = :postType) ORDER BY p.createdAt DESC")
    List<UUID> findIdsOrderByCreatedAtDescWithPostType(Pageable pageable, @Param("postType") String postType);

    @Query("SELECT p.id FROM CommunityPostEntity p WHERE p.authorName = :authorName ORDER BY p.createdAt DESC")
    List<UUID> findIdsByAuthorNameOrderByCreatedAtDesc(Pageable pageable, @Param("authorName") String authorName);

    @Query("SELECT DISTINCT p FROM CommunityPostEntity p LEFT JOIN FETCH p.dentalLinks d LEFT JOIN FETCH d.dental WHERE p.id IN :ids")
    List<CommunityPostEntity> findAllWithDentalsByIdIn(@Param("ids") List<UUID> ids);

    @Query("SELECT p FROM CommunityPostEntity p LEFT JOIN FETCH p.dentalLinks d LEFT JOIN FETCH d.dental WHERE p.id = :id")
    java.util.Optional<CommunityPostEntity> findByIdWithDentals(@Param("id") UUID id);
}
