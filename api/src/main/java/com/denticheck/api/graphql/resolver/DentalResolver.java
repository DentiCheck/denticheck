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
    public List<DentalEntity> hospitals() {
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
    public DentalPage searchHospitals(@Argument Double latitude, @Argument Double longitude,
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

    @SchemaMapping(typeName = "Hospital", field = "reviews")
    public List<com.denticheck.api.domain.dental.entity.DentalReviewEntity> reviews(DentalEntity dental) {
        return dentalService.getReviews(dental.getId());
    }

    @MutationMapping
    public com.denticheck.api.domain.dental.entity.DentalReviewEntity createReview(@Argument UUID dentalId,
            @Argument int rating,
            @Argument String content,
            @Argument List<String> tags) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return dentalService.createReview(dentalId, username, rating, content, tags);
    }

    @QueryMapping
    @PreAuthorize("hasRole('USER')")
    public List<DentalEntity> myFavoriteHospitals() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return dentalService.getMyFavoriteDentals(username);
    }
}
