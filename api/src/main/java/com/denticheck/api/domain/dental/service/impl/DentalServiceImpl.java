package com.denticheck.api.domain.dental.service.impl;

import com.denticheck.api.domain.dental.entity.DentalEntity;
import com.denticheck.api.domain.dental.entity.DentalLikeEntity;
import com.denticheck.api.domain.dental.repository.DentalLikeRepository;
import com.denticheck.api.domain.dental.repository.DentalRepository;
import com.denticheck.api.domain.dental.service.DentalService;
import com.denticheck.api.domain.user.entity.UserEntity;
import com.denticheck.api.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DentalServiceImpl implements DentalService {

    private final DentalRepository dentalRepository;
    private final DentalLikeRepository dentalLikeRepository;
    private final UserRepository userRepository;
    private final com.denticheck.api.domain.user.repository.RoleRepository roleRepository;
    private final com.denticheck.api.domain.dental.repository.DentalVisitRepository dentalVisitRepository;
    private final com.denticheck.api.domain.dental.repository.DentalReviewRepository dentalReviewRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public List<DentalEntity> getAllDentals() {
        return dentalRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<DentalEntity> getNearbyDentals(double latitude, double longitude,
            double radiusKm, org.springframework.data.domain.Pageable pageable) {
        // Calculate Bounding Box
        // 1 degree of latitude is approximately 111.32 km
        double latChange = radiusKm / 111.32;
        double minLat = latitude - latChange;
        double maxLat = latitude + latChange;

        // 1 degree of longitude is approximately 111.32 * cos(latitude) km
        double lngChange = radiusKm / (111.32 * Math.cos(Math.toRadians(latitude)));
        double minLng = longitude - lngChange;
        double maxLng = longitude + lngChange;

        return dentalRepository.findNearbyDentals(latitude, longitude, radiusKm, minLat, maxLat, minLng, maxLng,
                pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DentalEntity> getMyFavoriteDentals(String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        return dentalLikeRepository.findByUserId(user.getId()).stream()
                .map(DentalLikeEntity::getDental)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.denticheck.api.domain.dental.entity.DentalReviewEntity> getReviews(java.util.UUID dentalId) {
        return dentalReviewRepository.findByDentalId(dentalId);
    }

    @Override
    @Transactional
    public com.denticheck.api.domain.dental.entity.DentalReviewEntity createReview(java.util.UUID dentalId,
            String username, int rating, String content, java.util.List<String> tags) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseGet(() -> {
                    if ("anonymous".equals(username)) {
                        com.denticheck.api.domain.user.entity.RoleEntity userRole = roleRepository.findByName("USER")
                                .orElseGet(() -> roleRepository.save(com.denticheck.api.domain.user.entity.RoleEntity
                                        .builder().name("USER").build()));

                        UserEntity newUser = UserEntity.builder()
                                .id(java.util.UUID.randomUUID())
                                .username("anonymous")
                                .email("anonymous@example.com")
                                .nickname("익명")
                                .role(userRole)
                                .socialProviderType(com.denticheck.api.domain.user.entity.SocialProviderType.GOOGLE) // Mock
                                .build();
                        return userRepository.save(newUser);
                    }
                    throw new IllegalArgumentException("User not found: " + username);
                });

        DentalEntity dental = dentalRepository.findById(dentalId)
                .orElseThrow(() -> new IllegalArgumentException("Dental not found: " + dentalId));

        // Create Visit
        com.denticheck.api.domain.dental.entity.DentalVisitEntity visit = com.denticheck.api.domain.dental.entity.DentalVisitEntity
                .builder()
                .id(java.util.UUID.randomUUID())
                .user(user)
                .dental(dental)
                .visitedAt(java.time.LocalDate.now())
                .status("pending")
                .verifyMethod("manual")
                .build();
        dentalVisitRepository.save(visit);

        // Create Review
        String tagsJson = null;
        if (tags != null) {
            try {
                tagsJson = objectMapper.writeValueAsString(tags);
            } catch (Exception e) {
                // ignore or log
            }
        }

        com.denticheck.api.domain.dental.entity.DentalReviewEntity review = com.denticheck.api.domain.dental.entity.DentalReviewEntity
                .builder()
                .id(java.util.UUID.randomUUID())
                .visit(visit)
                .user(user)
                .dental(dental)
                .rating((short) rating)
                .content(content)
                .tagsJson(tagsJson)
                .isAnonymous(false)
                .status("active")
                .build();
        dentalReviewRepository.save(review);

        // Update Dental Rating
        dental.updateRating(rating, dental.getRatingCount(), dental.getRatingAvg());
        // dentalRepository.save(dental); // dirty checking

        return review;
    }
}
