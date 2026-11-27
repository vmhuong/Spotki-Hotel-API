package com.spotkihotel.service;

import com.spotkihotel.dto.review.ReviewDtos.*;
import com.spotkihotel.entity.Booking;
import com.spotkihotel.entity.Review;
import com.spotkihotel.entity.enums.BookingStatus;
import com.spotkihotel.entity.enums.ReviewStatus;
import com.spotkihotel.exception.BusinessException;
import com.spotkihotel.exception.ConflictException;
import com.spotkihotel.exception.ResourceNotFoundException;
import com.spotkihotel.exception.UnauthorizedException;
import com.spotkihotel.repository.BookingRepository;
import com.spotkihotel.repository.ReviewRepository;
import com.spotkihotel.security.UserPrincipal;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;

    @Transactional
    public ReviewResponse createReview(CreateReviewRequest request, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + request.getBookingId()));

        if (!booking.getGuest().getId().equals(principal.getId())) {
            throw new UnauthorizedException("You can only review your own booking.");
        }
        if (booking.getStatus() != BookingStatus.checked_out) {
            throw new BusinessException("You can only submit a review after checking out.");
        }
        if (reviewRepository.existsByBookingId(booking.getId())) {
            throw new ConflictException("A review already exists for this booking.");
        }

        Review review = reviewRepository.save(Review.builder()
                .booking(booking)
                .room(booking.getRoom())
                .guest(booking.getGuest())
                .roomRating(request.getRoomRating())
                .serviceRating(request.getServiceRating())
                .comment(request.getComment())
                .status(ReviewStatus.visible)
                .build());

        return toResponse(review);
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> getVisibleRoomReviews(Integer roomId, Pageable pageable) {
        return reviewRepository.findByRoomIdAndStatusOrderByCreatedAtDesc(roomId, ReviewStatus.visible, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<ReviewResponse> adminListReviews(ReviewStatus status, Integer roomId, Pageable pageable) {
        Specification<Review> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (roomId != null) {
                predicates.add(cb.equal(root.get("room").get("id"), roomId));
            }
            query.orderBy(cb.desc(root.get("createdAt")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return reviewRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional
    public ReviewResponse updateReviewStatus(Integer reviewId, ReviewStatus status) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review not found: " + reviewId));
        review.setStatus(status);
        review.setUpdatedAt(LocalDateTime.now());
        return toResponse(reviewRepository.save(review));
    }

    private ReviewResponse toResponse(Review review) {
        return ReviewResponse.builder()
                .id(review.getId())
                .bookingId(review.getBooking().getId())
                .roomId(review.getRoom().getId())
                .guestName(review.getGuest().getFullName())
                .roomRating(review.getRoomRating())
                .serviceRating(review.getServiceRating())
                .comment(review.getComment())
                .status(review.getStatus())
                .createdAt(review.getCreatedAt())
                .build();
    }
}
