package com.spotkihotel.dto.service;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

public class ServiceDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpsertServiceRequest {
        @NotBlank(message = "Service name is required")
        private String serviceName;

        @NotBlank(message = "Unit is required")
        private String unit = "lan";

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.0", message = "Price cannot be negative")
        private BigDecimal price;
    }
}
