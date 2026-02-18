package com.denticheck.api.graphql.resolver;

import com.denticheck.api.domain.dental.entity.DentalEntity;
<<<<<<< HEAD
import com.denticheck.api.domain.dental.service.DentalService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
=======
import com.denticheck.api.domain.dental.repository.DentalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
>>>>>>> origin/feature/api-service
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class DentalResolver {

<<<<<<< HEAD
    private final DentalService dentalService;

    @QueryMapping
    public List<DentalEntity> hospitals() {
        return dentalService.getAllDentals();
    }

    // Mapping new logic to old query name 'searchHospitals' if it existed, or
    // 'hospitals' variants.
    // Assuming 'searchHospitals' was used for nearby search or something else.
    // Based on previous code, search logic might have been inside hospitals or
    // separate.
    // Let's implement search by location if arguments are provided, otherwise get
    // all.
    // Wait, GraphQL schema defines arguments. I should check schema.
    // Assuming schema has: hospitals(lat: Float, lng: Float, radius: Float):
    // [Hospital]

    @QueryMapping
    public DentalPage searchHospitals(@Argument Double latitude, @Argument Double longitude,
            @Argument Double radius, @Argument int page, @Argument int size) {

        if (latitude == null || longitude == null || radius == null) {
            // Default behavior or error. For now, empty or throw.
            // But logic says if args provided.
            // In schema, lat/long are non-null (!), so they will be provided.
        }

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        org.springframework.data.domain.Page<DentalEntity> dentalPage = dentalService.getNearbyDentals(latitude,
                longitude, radius, pageable);

        return new DentalPage(dentalPage);
    }

    @lombok.Data
    public static class DentalPage {
        private List<DentalEntity> content;
        private PageInfo pageInfo;

        public DentalPage(org.springframework.data.domain.Page<DentalEntity> page) {
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

    @org.springframework.graphql.data.method.annotation.SchemaMapping(typeName = "Hospital", field = "reviews")
    public List<com.denticheck.api.domain.dental.entity.DentalReviewEntity> reviews(DentalEntity dental) {
        return dentalService.getReviews(dental.getId());
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    public com.denticheck.api.domain.dental.entity.DentalReviewEntity createReview(@Argument java.util.UUID dentalId,
            @Argument int rating,
            @Argument String content,
            @Argument List<String> tags) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication().getName();
        return dentalService.createReview(dentalId, username, rating, content, tags);
    }

    @QueryMapping
    @PreAuthorize("hasRole('USER')")
    public List<DentalEntity> myFavoriteHospitals() {
        // We need username. Spring Security context holds it.
        // In a real app, we extract it from SecurityContextHolder.
        // For simplicity assuming utility or just passing a hardcoded user for now if
        // unknown.
        // But better: use @AuthenticationPrincipal or SecurityContext.

        // However, the previous implementation used SecurityContextHelper or similar.
        // Let's use a standard way.
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication().getName();
        return dentalService.getMyFavoriteDentals(username);
=======
    private final DentalRepository dentalRepository;

    @QueryMapping
    public List<DentalEntity> dentals(
            @Argument("name") String name,
            @Argument("limit") Integer limit) {
        int max = (limit != null && limit > 0 && limit <= 100) ? limit : 50;
        if (name != null && !name.isBlank()) {
            return dentalRepository.findByNameContainingIgnoreCaseOrderByNameAsc(
                    name, org.springframework.data.domain.PageRequest.of(0, max));
        }
        return dentalRepository.findAllByOrderByNameAsc(
                org.springframework.data.domain.PageRequest.of(0, max));
>>>>>>> origin/feature/api-service
    }
}
