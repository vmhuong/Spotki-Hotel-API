package com.spotkihotel.dto.guest;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
        private Boolean customerIsActive;
        private LocalDateTime createdAt;
    }
}
