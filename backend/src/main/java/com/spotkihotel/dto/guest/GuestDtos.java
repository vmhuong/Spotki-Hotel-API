package com.spotkihotel.dto.guest;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class GuestDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GuestResponse {
        private Integer id;
        private String fullName;
        private String phone;
        private String email;
        private String identityNo;
        private String address;
        private Boolean isVip;
        private Integer loyaltyPoints;
        private BigDecimal totalSpent;
        private String membershipTier;
        private Boolean customerIsActive;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpsertGuestRequest {
        @NotBlank(message = "Full name is required")
        private String fullName;

        @NotBlank(message = "Phone is required")
        private String phone;

        @Email(message = "Invalid email format")
        private String email;

        private String identityNo;
        private String address;
        private Boolean isVip;
        private Boolean customerIsActive;
    }
}
