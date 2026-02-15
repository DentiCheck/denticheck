package com.denticheck.api.domain.hospital.repository;

import com.denticheck.api.domain.hospital.entity.HospitalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface HospitalRepository extends JpaRepository<HospitalEntity, UUID> {

        // Haversine formula to calculate distance in Kilometers
        String HAVERSINE_FORMULA = "(6371 * acos(cos(radians(:latitude)) * cos(radians(h.latitude)) *"
                        + " cos(radians(h.longitude) - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(h.latitude))))";

        @Query(value = "SELECT * FROM hospitals h WHERE " + HAVERSINE_FORMULA + " < :radius ORDER BY "
                        + HAVERSINE_FORMULA, nativeQuery = true)
        List<HospitalEntity> findNearbyHospitals(@Param("latitude") double latitude,
                        @Param("longitude") double longitude, @Param("radius") double radius);

        List<HospitalEntity> findByNameContaining(String name);

        List<HospitalEntity> findByAddressContaining(String address);

        List<HospitalEntity> findByNameContainingOrAddressContaining(String name, String address);
}
