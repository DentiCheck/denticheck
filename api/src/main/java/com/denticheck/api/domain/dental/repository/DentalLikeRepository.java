package com.denticheck.api.domain.dental.repository;

import com.denticheck.api.domain.dental.entity.DentalLikeEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DentalLikeRepository extends JpaRepository<DentalLikeEntity, DentalLikeEntity.DentalLikeId> {
    List<DentalLikeEntity> findByUserId(UUID userId);
}
