package com.denticheck.api.domain.dental.repository;

import com.denticheck.api.domain.dental.entity.DentalReviewEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DentalReviewRepository extends JpaRepository<DentalReviewEntity, UUID> {
    List<DentalReviewEntity> findByDentalId(UUID dentalId);
}
