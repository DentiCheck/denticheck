package com.denticheck.api.domain.dental.service;

import com.denticheck.api.domain.dental.entity.DentalEntity;

import java.util.List;

public interface DentalService {
    List<DentalEntity> getAllDentals();

    org.springframework.data.domain.Page<DentalEntity> getNearbyDentals(double latitude, double longitude,
            double radiusKm,
            org.springframework.data.domain.Pageable pageable);

    List<DentalEntity> getMyFavoriteDentals(String username);

    List<com.denticheck.api.domain.dental.entity.DentalReviewEntity> getReviews(java.util.UUID dentalId);

    com.denticheck.api.domain.dental.entity.DentalReviewEntity createReview(java.util.UUID dentalId, String username,
            int rating, String content, java.util.List<String> tags);
}
