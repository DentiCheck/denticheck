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
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DentalServiceImpl implements DentalService {

    private final DentalRepository dentalRepository;
    private final DentalLikeRepository dentalLikeRepository;
    private final UserRepository userRepository;
    private final com.denticheck.api.domain.user.repository.RoleRepository roleRepository;
    private final com.denticheck.api.domain.dental.repository.DentalVisitRepository dentalVisitRepository;
    private final com.denticheck.api.domain.dental.repository.DentalReviewRepository dentalReviewRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @PostConstruct
    public void init() {
        log.info("DEBUG: DentalServiceImpl initialized. Ready to create reviews.");
    }

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
            String username, int rating, String content, java.util.List<String> tags, boolean isAnonymous) {
        log.info("DEBUG: createReview started. username={}, dentalId={}, isAnonymous={}", username, dentalId,
                isAnonymous);
        UserEntity user;

        if ("anonymous".equals(username)) {
            // Dev Pass / Guest Logic
            user = userRepository.findByUsername("anonymous")
                    .orElseGet(() -> {
                        com.denticheck.api.domain.user.entity.RoleEntity userRole = roleRepository
                                .findByName("ROLE_USER")
                                .orElseGet(() -> roleRepository.save(com.denticheck.api.domain.user.entity.RoleEntity
                                        .builder().name("ROLE_USER").build()));

                        UserEntity newUser = UserEntity.builder()
                                .username("anonymous")
                                .email("anonymous@example.com")
                                .nickname("익명")
                                .role(userRole)
                                .socialProviderType(com.denticheck.api.domain.user.entity.SocialProviderType.GOOGLE) // Mock
                                .build();
                        return userRepository.save(newUser);
                    });
        } else {
            // Authenticated User Logic
            user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
        }
        log.info("DEBUG: User resolved. userId={}", user.getId());

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
        try {
            visit = dentalVisitRepository.save(visit);
        } catch (Exception e) {
            log.error("Failed to save visit", e);
            throw e;
        }

        // Create Review
        String tagsJson = null;
        if (tags != null) {
            try {
                tagsJson = objectMapper.writeValueAsString(tags);
            } catch (Exception e) {
                log.warn("Failed to serialize tags", e);
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
                .isAnonymous(isAnonymous)
                .status("active")
                .build();
        try {
            review = dentalReviewRepository.save(review);
        } catch (Exception e) {
            log.error("Failed to save review", e);
            throw e;
        }

        // Update Dental Rating
        Integer currentCount = dental.getRatingCount() != null ? dental.getRatingCount() : 0;
        java.math.BigDecimal currentAvg = dental.getRatingAvg() != null ? dental.getRatingAvg()
                : java.math.BigDecimal.ZERO;

        dental.updateRating(rating, currentCount, currentAvg);
        dentalRepository.saveAndFlush(dental);

        log.info("DEBUG: Updated Rating - Count: {}, Avg: {}", dental.getRatingCount(), dental.getRatingAvg());

        return review;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DentalEntity> searchDentals(String name, int limit) {
        int max = (limit > 0 && limit <= 100) ? limit : 50;
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(0, max);
        if (name != null && !name.isBlank()) {
            return dentalRepository.findByNameContainingIgnoreCaseOrderByNameAsc(name, pageable);
        }
        return dentalRepository.findAllByOrderByNameAsc(pageable);
    }

    @Override
    @Transactional
    public boolean toggleDentalLike(String username, java.util.UUID dentalId) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        DentalEntity dental = dentalRepository.findById(dentalId)
                .orElseThrow(() -> new IllegalArgumentException("Dental not found: " + dentalId));

        DentalLikeEntity.DentalLikeId likeId = new DentalLikeEntity.DentalLikeId(user.getId(), dental.getId());

        if (dentalLikeRepository.existsById(likeId)) {
            dentalLikeRepository.deleteById(likeId);
            return false; // Unliked
        } else {
            DentalLikeEntity like = DentalLikeEntity.builder()
                    .userId(user.getId())
                    .dentalId(dental.getId())
                    .build();
            dentalLikeRepository.save(like);
            return true; // Liked
        }
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isLiked(String username, java.util.UUID dentalId) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        DentalLikeEntity.DentalLikeId likeId = new DentalLikeEntity.DentalLikeId(user.getId(), dentalId);
        return dentalLikeRepository.existsById(likeId);
    }

    @Override
    @Transactional
    public void deleteReview(java.util.UUID reviewId, String username) {
        com.denticheck.api.domain.dental.entity.DentalReviewEntity review = dentalReviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found: " + reviewId));

        // Allow deletion by owner or anonymous/unauthenticated users
        if (!"anonymous".equals(username) && !"anonymousUser".equals(username)) {
            UserEntity user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
            if (!review.getUser().getId().equals(user.getId())) {
                throw new IllegalArgumentException("You can only delete your own reviews.");
            }
        }

        java.util.UUID dentalId = review.getDental().getId();

        // Save visit ID before deleting the review (to avoid lazy loading issues)
        java.util.UUID visitId = review.getVisit() != null ? review.getVisit().getId() : null;

        // Delete the review first (review has FK to visit)
        dentalReviewRepository.delete(review);
        dentalReviewRepository.flush();

        // Then delete the associated visit
        if (visitId != null) {
            dentalVisitRepository.deleteById(visitId);
        }

        // Recalculate denormalized rating on dental entity
        DentalEntity dental = dentalRepository.findById(dentalId)
                .orElseThrow(() -> new IllegalArgumentException("Dental not found: " + dentalId));
        List<com.denticheck.api.domain.dental.entity.DentalReviewEntity> remaining = dentalReviewRepository
                .findByDentalId(dentalId);
        if (remaining.isEmpty()) {
            dental.setRatingAvg(java.math.BigDecimal.ZERO);
            dental.setRatingCount(0);
        } else {
            double avg = remaining.stream().mapToInt(r -> r.getRating().intValue()).average().orElse(0.0);
            dental.setRatingAvg(java.math.BigDecimal.valueOf(avg).setScale(2, java.math.RoundingMode.HALF_UP));
            dental.setRatingCount(remaining.size());
        }
        dentalRepository.save(dental);
    }
}
