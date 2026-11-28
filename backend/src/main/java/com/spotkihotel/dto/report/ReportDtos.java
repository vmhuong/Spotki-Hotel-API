package com.spotkihotel.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class ReportDtos {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentRecordResponse {
        private Integer id;
        private Integer bookingId;
        private String bookingCode;
        private Integer hotelId;
        private BigDecimal amount;
        private String method;
        private LocalDateTime paidAt;
        private String payerName;
        private String cashierName;
        private String note;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RevenueReportResponse {
        private LocalDate from;
        private LocalDate to;
        private Integer hotelId;
        private BigDecimal totalRevenue;
        private long transactionCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopRoomReportResponse {
        private Integer roomId;
        private String roomNumber;
        private String roomType;
        private String hotelName;
        private long bookingCount;
    }
}
