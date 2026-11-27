package com.spotkihotel.dto.hotel;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public class HotelDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpsertHotelRequest {
        @NotBlank(message = "Hotel name is required")
        private String hotelName;

        private String brandName = "Spotki Hotels";

        @Min(1)
        @Max(5)
        private Integer starRating = 5;

        @NotBlank(message = "Address is required")
        private String address;

        @NotBlank(message = "City is required")
        private String city;

        private String phone;

        @Email(message = "Invalid email format")
        private String email;

        private String heroImage;
        private String description;
    }
}
