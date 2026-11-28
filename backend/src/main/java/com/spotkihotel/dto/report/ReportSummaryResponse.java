package com.spotkihotel.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportSummaryResponse {
    private long totalRooms;
    private long availableRooms;
    private long occupiedRooms;
    private long cleaningRooms;
    private long totalBookings;
    private long activeBookedCount;
    private long checkedInCount;
    private long checkedOutCount;
    private BigDecimal totalRevenue;
}
