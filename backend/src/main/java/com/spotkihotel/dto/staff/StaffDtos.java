package com.spotkihotel.dto.staff;

import com.spotkihotel.entity.enums.StaffRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

public class StaffDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StaffResponse {
        private Integer id;
        private String username;
        private String fullName;
        private String email;
        private StaffRole role;
        private Integer hotelId;
        private Boolean isActive;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateStaffRequest {
        @NotBlank(message = "Username is required")
        private String username;

        @NotBlank(message = "Password is required")
        @Size(min = 10, message = "Password must be at least 10 characters")
        private String password;

        @NotBlank(message = "Full name is required")
        private String fullName;

        @Email(message = "Invalid email format")
        private String email;

        @NotNull(message = "Role is required")
        private StaffRole role;

        private Integer hotelId;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateStaffRequest {
        private String fullName;

        @Email(message = "Invalid email format")
        private String email;

        private StaffRole role;
        private Integer hotelId;
        private Boolean isActive;
    }
}
