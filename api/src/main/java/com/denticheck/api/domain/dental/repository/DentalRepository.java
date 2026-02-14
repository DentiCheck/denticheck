package com.denticheck.api.domain.dental.repository;

import com.denticheck.api.domain.dental.entity.DentalEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DentalRepository extends JpaRepository<DentalEntity, UUID> {

        // Haversine formula for lat/lng columns in dentals table
        String HAVERSINE_FORMULA = "(6371 * acos(cos(radians(:latitude)) * cos(radians(d.lat)) *"
                        + " cos(radians(d.lng) - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(d.lat))))";

        @Query(value = "SELECT * FROM dentals d WHERE " + HAVERSINE_FORMULA + " < :radius ORDER BY "
                        + HAVERSINE_FORMULA, nativeQuery = true)
        List<DentalEntity> findNearbyDentals(@Param("latitude") double latitude,
                        @Param("longitude") double longitude,
                        @Param("radius") double radius);
}
