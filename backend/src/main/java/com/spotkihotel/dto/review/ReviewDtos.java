package com.spotkihotel.dto.review;

import com.spotkihotel.entity.enums.ReviewStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ReviewDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateReviewRequest {
        @NotNull(message = "Booking ID is required")
        private Integer bookingId;

        @NotNull
        @DecimalMin("1.0")
        @DecimalMax("5.0")
        private BigDecimal roomRating;

        @NotNull
        @DecimalMin("1.0")
        @DecimalMax("5.0")
        private BigDecimal serviceRating;

        private String comment;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewResponse {
        private Integer id;
        private Integer bookingId;
        private Integer roomId;
        private String guestName;
        private BigDecimal roomRating;
        private BigDecimal serviceRating;
        private String comment;
        private ReviewStatus status;
        private LocalDateTime createdAt;
    }
}
