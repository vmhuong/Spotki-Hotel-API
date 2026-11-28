package com.spotkihotel.dto.room;

import com.spotkihotel.entity.enums.HousekeepingStatus;
import com.spotkihotel.entity.enums.RoomStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

public class RoomDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomResponse {
        private Integer id;
        private Integer hotelId;
        private String hotelName;
        private String roomNumber;
        private String roomType;
        private Integer floorNo;
        private Integer capacity;
        private String roomSize;
        private String bedType;
        private BigDecimal pricePerNight;
        private BigDecimal hourlyRate;
        private BigDecimal extraGuestRatePercent;
        private String amenities;
        private String packageName;
        private String imageUrl;
        private String galleryUrls;
        private RoomStatus status;
        private HousekeepingStatus housekeepingStatus;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRoomRequest {
        @NotNull(message = "Hotel ID is required")
        private Integer hotelId;

        @NotBlank(message = "Room number is required")
        private String roomNumber;

        @NotBlank(message = "Room type is required")
        private String roomType;

        @Min(1)
        private Integer floorNo = 1;

        @Min(1)
        private Integer capacity = 2;

        private String roomSize;
        private String bedType;

        @NotNull
        @DecimalMin("0.0")
        private BigDecimal pricePerNight;

        @NotNull
        @DecimalMin("0.0")
        private BigDecimal hourlyRate;

        private BigDecimal extraGuestRatePercent = new BigDecimal("25.00");
        private String amenities;
        private String packageName;
        private String imageUrl;
        private String galleryUrls;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateHousekeepingRequest {
        private HousekeepingStatus housekeepingStatus;
        private RoomStatus roomStatus;
        private String note;
    }
}
