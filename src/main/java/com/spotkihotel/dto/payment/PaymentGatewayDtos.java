package com.spotkihotel.dto.payment;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentGatewayDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InitiateGatewayPaymentRequest {
        @NotNull(message = "Booking ID is required")
        private Integer bookingId;

        @NotNull(message = "Amount is required")
        @DecimalMin(value = "1000.0", message = "Amount must be at least 1,000 VND")
        private BigDecimal amount;

        @NotBlank(message = "Provider is required (e.g. VIETQR, ZALOPAY)")
        private String provider = "VIETQR";
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InitiateGatewayPaymentResponse {
        private String provider;
        private String appTransId;
        private BigDecimal amount;
        private String status;
        private String orderUrl;
        private String sampleHmacSignature;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GatewayCallbackRequest {
        @NotBlank
        private String provider;

        @NotBlank
        private String appTransId;

        @NotBlank
        private String gatewayTransId;

        @NotNull
        private BigDecimal amount;

        @NotBlank
        private String mac;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GatewayCallbackResponse {
        private String appTransId;
        private String status;
        private boolean idempotentReplay;
        private Integer paymentId;
        private LocalDateTime paidAt;
    }
}
