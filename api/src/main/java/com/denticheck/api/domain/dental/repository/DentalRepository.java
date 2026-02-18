package com.denticheck.api.domain.dental.repository;

import com.denticheck.api.domain.dental.entity.DentalEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DentalRepository extends JpaRepository<DentalEntity, UUID> {

    // Haversine formula for lat/lng columns in dentals table
    String HAVERSINE_FORMULA = "(6371 * acos(cos(radians(:latitude)) * cos(radians(d.lat)) *"
            + " cos(radians(d.lng) - radians(:longitude)) + sin(radians(:latitude)) * sin(radians(d.lat))))";

    @Query(value = "SELECT * FROM dentals d WHERE d.lat BETWEEN :minLat AND :maxLat AND d.lng BETWEEN :minLng AND :maxLng AND "
            + HAVERSINE_FORMULA + " < :radius ORDER BY "
            + HAVERSINE_FORMULA, countQuery = "SELECT count(*) FROM dentals d WHERE d.lat BETWEEN :minLat AND :maxLat AND d.lng BETWEEN :minLng AND :maxLng AND "
                    + HAVERSINE_FORMULA
                    + " < :radius", nativeQuery = true)
    Page<DentalEntity> findNearbyDentals(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radius") double radius,
            @Param("minLat") double minLat,
            @Param("maxLat") double maxLat,
            @Param("minLng") double minLng,
            @Param("maxLng") double maxLng,
            Pageable pageable);

    List<DentalEntity> findByNameContainingIgnoreCaseOrderByNameAsc(String name, Pageable pageable);

    List<DentalEntity> findAllByOrderByNameAsc(Pageable pageable);

    long countByIdIn(Iterable<UUID> ids);

    List<DentalEntity> findByNameContaining(String name);

    List<DentalEntity> findByAddressContaining(String address);

    List<DentalEntity> findByNameContainingOrAddressContaining(String name, String address);
}
