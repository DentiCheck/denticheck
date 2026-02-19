package com.denticheck.api.domain.hospital.repository;

import com.denticheck.api.domain.hospital.entity.UserHospitalEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserHospitalRepository extends JpaRepository<UserHospitalEntity, Long> {
    List<UserHospitalEntity> findByUserIdAndIsFavoriteTrue(UUID userId);
}
