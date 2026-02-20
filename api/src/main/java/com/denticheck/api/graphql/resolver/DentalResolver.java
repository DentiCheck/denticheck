package com.denticheck.api.graphql.resolver;

import com.denticheck.api.domain.dental.entity.DentalEntity;
import com.denticheck.api.domain.dental.repository.DentalRepository;
import com.denticheck.api.domain.dental.service.DentalService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

@Controller
@RequiredArgsConstructor
public class DentalResolver {

    private final DentalService dentalService;
    private final DentalRepository dentalRepository;

    @QueryMapping
    public List<DentalEntity> allDentals() {
        return dentalService.getAllDentals();
    }

    @QueryMapping
    public List<DentalEntity> dentals(
            @Argument("name") String name,
            @Argument("limit") Integer limit) {
        int max = (limit != null && limit > 0 && limit <= 100) ? limit : 50;
        if (name != null && !name.isBlank()) {
            return dentalRepository.findByNameContainingIgnoreCaseOrderByNameAsc(
                    name, PageRequest.of(0, max));
        }
        return dentalRepository.findAllByOrderByNameAsc(
                PageRequest.of(0, max));
    }

    @QueryMapping
    public DentalPage searchDentals(@Argument Double latitude, @Argument Double longitude,
            @Argument Double radius, @Argument int page, @Argument int size) {

        double searchRadius = (radius != null) ? radius : 5.0;
        Pageable pageable = PageRequest.of(page, size);
        Page<DentalEntity> dentalPage = dentalService.getNearbyDentals(latitude,
                longitude, searchRadius, pageable);

        return new DentalPage(dentalPage);
    }

    @lombok.Data
    public static class DentalPage {
        private List<DentalEntity> content;
        private PageInfo pageInfo;

        public DentalPage(Page<DentalEntity> page) {
            this.content = page.getContent();
            this.pageInfo = new PageInfo(page.getNumber(), page.getTotalPages(), (int) page.getTotalElements());
        }
    }

    @lombok.Data
    @lombok.AllArgsConstructor
    public static class PageInfo {
        private int currentPage;
        private int totalPages;
        private int totalElements;
    }

    @SchemaMapping(typeName = "Dental", field = "reviews")
    public List<com.denticheck.api.domain.dental.entity.DentalReviewEntity> reviews(DentalEntity dental) {
        return dentalService.getReviews(dental.getId());
    }

    @SchemaMapping(typeName = "Dental", field = "ratingAvg")
    public Double ratingAvg(DentalEntity dental) {
        List<com.denticheck.api.domain.dental.entity.DentalReviewEntity> reviews = dentalService
                .getReviews(dental.getId());
        if (reviews == null || reviews.isEmpty())
            return 0.0;
        double sum = reviews.stream().mapToInt(r -> r.getRating().intValue()).sum();
        return Math.round(sum / reviews.size() * 10.0) / 10.0;
    }

    @SchemaMapping(typeName = "Dental", field = "ratingCount")
    public Integer ratingCount(DentalEntity dental) {
        List<com.denticheck.api.domain.dental.entity.DentalReviewEntity> reviews = dentalService
                .getReviews(dental.getId());
        return reviews != null ? reviews.size() : 0;
    }

    @SchemaMapping(typeName = "Dental", field = "isLiked")
    public Boolean isLiked(DentalEntity dental) {
        try {
            String username = SecurityContextHolder.getContext().getAuthentication().getName();
            if (username == null || username.equals("anonymousUser")) {
                return false;
            }
            return dentalService.isLiked(username, dental.getId());
        } catch (Exception e) {
            return false;
        }
    }

    @MutationMapping
    public com.denticheck.api.domain.dental.entity.DentalReviewEntity createReview(@Argument UUID dentalId,
            @Argument int rating,
            @Argument String content,
            @Argument List<String> tags,
            @Argument boolean isAnonymous) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return dentalService.createReview(dentalId, username, rating, content, tags, isAnonymous);
    }

    @QueryMapping
    @PreAuthorize("hasRole('USER')")
    public List<DentalEntity> myFavoriteDentals() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return dentalService.getMyFavoriteDentals(username);
    }

    @MutationMapping
    @PreAuthorize("hasRole('USER')")
    public boolean toggleDentalLike(@Argument java.util.UUID dentalId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return dentalService.toggleDentalLike(username, dentalId);
    }

    @MutationMapping
    public boolean deleteReview(@Argument java.util.UUID reviewId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        dentalService.deleteReview(reviewId, username);
        return true;
    }
}
