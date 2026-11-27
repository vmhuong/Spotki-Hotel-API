package com.spotkihotel.controller;

import com.spotkihotel.dto.ApiResponse;
import com.spotkihotel.dto.review.ReviewDtos.*;
import com.spotkihotel.entity.enums.ReviewStatus;
import com.spotkihotel.security.UserPrincipal;
import com.spotkihotel.service.ReviewService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Reviews", description = "Customer room reviews and moderation")
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/reviews")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Submit a review for a checked-out booking")
    public ResponseEntity<ApiResponse<ReviewResponse>> createReview(
            @Valid @RequestBody CreateReviewRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Review submitted", reviewService.createReview(request, principal)));
    }

    @GetMapping("/rooms/{roomId}/reviews")
    @Operation(summary = "Get visible reviews for a room")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> getRoomReviews(
            @PathVariable Integer roomId,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(reviewService.getVisibleRoomReviews(roomId, pageable)));
    }

    @GetMapping("/admin/reviews")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "List all reviews including hidden for moderation")
    public ResponseEntity<ApiResponse<Page<ReviewResponse>>> adminListReviews(
            @RequestParam(required = false) ReviewStatus status,
            @RequestParam(required = false) Integer roomId,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(reviewService.adminListReviews(status, roomId, pageable)));
    }

    @PatchMapping("/admin/reviews/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Show or hide a review (Admin/Manager)")
    public ResponseEntity<ApiResponse<ReviewResponse>> updateStatus(
            @PathVariable Integer id,
            @RequestParam ReviewStatus status
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Review status updated", reviewService.updateReviewStatus(id, status)));
    }
}
