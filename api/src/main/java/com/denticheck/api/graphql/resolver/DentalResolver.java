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
    public List<DentalEntity> allDentals() {
        return dentalService.getAllDentals();
    }

    @QueryMapping
    public List<DentalEntity> dentals(
            @Argument("name") String name,
            @Argument("limit") Integer limit) {
        return dentalService.searchDentals(name, limit != null ? limit : 50);
    }

    @QueryMapping
    public DentalPage searchDentals(@Argument Double latitude, @Argument Double longitude,
            @Argument Double radius, @Argument int page, @Argument int size) {
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

    // ...
    @org.springframework.graphql.data.method.annotation.SchemaMapping(typeName = "Dental", field = "reviews")
    public List<com.denticheck.api.domain.dental.entity.DentalReviewEntity> reviews(DentalEntity dental) {
        return dentalService.getReviews(dental.getId());
    }

    @org.springframework.graphql.data.method.annotation.SchemaMapping(typeName = "Dental", field = "ratingAvg")
    public Double ratingAvg(DentalEntity dental) {
        return dental.getRatingAvg() != null ? dental.getRatingAvg().doubleValue() : 0.0;
    }

    @org.springframework.graphql.data.method.annotation.SchemaMapping(typeName = "Dental", field = "ratingCount")
    public Integer ratingCount(DentalEntity dental) {
        return dental.getRatingCount() != null ? dental.getRatingCount() : 0;
    }

    @org.springframework.graphql.data.method.annotation.SchemaMapping(typeName = "Dental", field = "isLiked")
    public Boolean isLiked(DentalEntity dental) {
        try {
            String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                    .getAuthentication().getName();
            // System.out.println("DEBUG: isLiked check - username: " + username + ",
            // dentalId: " + dental.getId());
            if (username == null || username.equals("anonymousUser")) {
                return false;
            }
            return dentalService.isLiked(username, dental.getId());
        } catch (Exception e) {
            // e.printStackTrace();
            return false;
        }
    }

    @QueryMapping
    @PreAuthorize("hasRole('USER')")
    public List<DentalEntity> myFavoriteDentals() {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication().getName();
        return dentalService.getMyFavoriteDentals(username);
    }

    @org.springframework.graphql.data.method.annotation.MutationMapping
    @PreAuthorize("hasRole('USER')")
    public boolean toggleDentalLike(@Argument java.util.UUID dentalId) {
        String username = org.springframework.security.core.context.SecurityContextHolder.getContext()
                .getAuthentication().getName();
        return dentalService.toggleDentalLike(username, dentalId);
    }
}
