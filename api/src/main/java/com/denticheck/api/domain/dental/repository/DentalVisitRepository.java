package com.denticheck.api.domain.dental.repository;

import com.denticheck.api.domain.dental.entity.DentalVisitEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface DentalVisitRepository extends JpaRepository<DentalVisitEntity, UUID> {
}
