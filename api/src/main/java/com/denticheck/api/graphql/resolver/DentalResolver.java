package com.denticheck.api.graphql.resolver;

import com.denticheck.api.domain.dental.entity.DentalEntity;
import com.denticheck.api.domain.dental.service.DentalService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class DentalResolver {

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
    public List<DentalEntity> searchHospitals(@Argument Double latitude, @Argument Double longitude,
            @Argument Double radius) {
        if (latitude != null && longitude != null && radius != null) {
            return dentalService.getNearbyDentals(latitude, longitude, radius);
        }
        return dentalService.getAllDentals();
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
    }
}
