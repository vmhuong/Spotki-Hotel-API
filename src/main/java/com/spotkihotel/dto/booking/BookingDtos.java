package com.spotkihotel.dto.booking;

import com.spotkihotel.entity.enums.BookingStatus;
import com.spotkihotel.entity.enums.PricingMode;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class BookingDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateBookingRequest {
        @NotNull(message = "Room ID is required")
        private Integer roomId;

        @NotNull(message = "Check-in date is required")
        @FutureOrPresent(message = "Check-in date must be today or in the future")
        private LocalDate checkIn;

        @NotNull(message = "Check-out date is required")
        private LocalDate checkOut;

        private PricingMode pricingMode = PricingMode.night;

        @Min(value = 1, message = "At least 1 adult is required")
        private Integer adults = 1;

        @Min(value = 0, message = "Children cannot be negative")
        private Integer children = 0;

        @NotBlank(message = "Contact name is required")
        private String contactName;

        @NotBlank(message = "Contact phone is required")
        private String contactPhone;

        @Email(message = "Invalid contact email")
        private String contactEmail;

        private String paymentMethod = "Chuyen khoan VietQR";
        private String transactionRef;
        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomerEditBookingRequest {
        @NotNull(message = "Check-in date is required")
        @FutureOrPresent(message = "Check-in date must be today or in the future")
        private LocalDate checkIn;

        @NotNull(message = "Check-out date is required")
        private LocalDate checkOut;

        @Min(1)
        private Integer adults = 1;

        @Min(0)
        private Integer children = 0;

        private String note;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddServiceRequest {
        @NotNull(message = "Service ID is required")
        private Integer serviceId;

        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity = 1;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecordPaymentRequest {
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "1000.0", message = "Amount must be at least 1,000 VND")
        private BigDecimal amount;

        @NotBlank(message = "Payment method is required")
        private String method;

        private String payerName;
        private String note;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BookingResponse {
        private Integer id;
        private String bookingCode;
        private Integer roomId;
        private String roomNumber;
        private String roomType;
        private Integer hotelId;
        private String hotelName;
        private Integer guestId;
        private String guestName;
        private LocalDate checkIn;
        private LocalDate checkOut;
        private PricingMode pricingMode;
        private Integer adults;
        private Integer children;
        private BookingStatus status;
        private BigDecimal estimatedRoomTotal;
        private BigDecimal depositAmount;
        private BigDecimal totalPaid;
        private Integer customerEditCount;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InvoiceSummaryResponse {
        private Integer bookingId;
        private String bookingCode;
        private BigDecimal roomCharge;
        private BigDecimal extraGuestSurcharge;
        private BigDecimal serviceCharge;
        private BigDecimal subtotal;
        private BigDecimal vatAmount;
        private BigDecimal grandTotal;
        private BigDecimal totalPaid;
        private BigDecimal remainingBalance;
        private Integer loyaltyPointsEarned;
        private List<BookingServiceItemResponse> services;
        private List<PaymentResponse> payments;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BookingServiceItemResponse {
        private Integer id;
        private Integer bookingId;
        private Integer serviceId;
        private String serviceName;
        private Integer quantity;
        private BigDecimal unitPrice;
        private BigDecimal lineTotal;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentResponse {
        private Integer id;
        private Integer bookingId;
        private String bookingCode;
        private BigDecimal amount;
        private String method;
        private LocalDateTime paidAt;
        private String payerName;
        private String cashierName;
        private String note;
    }
}
