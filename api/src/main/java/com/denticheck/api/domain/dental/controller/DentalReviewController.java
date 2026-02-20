package com.denticheck.api.domain.dental.controller;

import com.denticheck.api.domain.dental.dto.DentalReviewRequest;
import com.denticheck.api.domain.dental.dto.DentalReviewResponse;
import com.denticheck.api.domain.dental.entity.DentalReviewEntity;
import com.denticheck.api.domain.dental.service.DentalService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/dentals")
@RequiredArgsConstructor
@Tag(name = "Dental Review", description = "Dental Review API")
public class DentalReviewController {

    private final DentalService dentalService;
    private final ObjectMapper objectMapper;

    @GetMapping("/{dentalId}/reviews")
    @Operation(summary = "Get reviews for a dental", description = "Retrieve a list of reviews for a specific dental clinic.")
    public ResponseEntity<List<DentalReviewResponse>> getReviews(@PathVariable UUID dentalId) {
        List<DentalReviewEntity> reviews = dentalService.getReviews(dentalId);
        List<DentalReviewResponse> response = reviews.stream()
                .map(review -> DentalReviewResponse.from(review, objectMapper))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{dentalId}/reviews")
    @Operation(summary = "Create a review", description = "Create a new review for a dental clinic.")
    public ResponseEntity<DentalReviewResponse> createReview(
            @PathVariable UUID dentalId,
            @RequestBody DentalReviewRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String username = "anonymous";
        if (userDetails != null) {
            username = userDetails.getUsername();
        }

        boolean isAnonymous = Boolean.TRUE.equals(request.getIsAnonymous());

        DentalReviewEntity review = dentalService.createReview(
                dentalId,
                username,
                request.getRating(),
                request.getContent(),
                request.getTags(),
                isAnonymous);

        return ResponseEntity.ok(DentalReviewResponse.from(review, objectMapper));
    }

    @DeleteMapping("/{dentalId}/reviews/{reviewId}")
    @Operation(summary = "Delete a review", description = "Delete a review by its ID.")
    public ResponseEntity<Void> deleteReview(
            @PathVariable UUID dentalId,
            @PathVariable UUID reviewId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String username = "anonymous";
        if (userDetails != null) {
            username = userDetails.getUsername();
        }
        dentalService.deleteReview(reviewId, username);
        return ResponseEntity.noContent().build();
    }
}
