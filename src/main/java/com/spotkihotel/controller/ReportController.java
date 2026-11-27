package com.spotkihotel.controller;

import com.spotkihotel.dto.ApiResponse;
import com.spotkihotel.dto.report.ReportDtos.*;
import com.spotkihotel.dto.report.ReportSummaryResponse;
import com.spotkihotel.security.UserPrincipal;
import com.spotkihotel.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Tag(name = "Reports & Payments", description = "Operational summary, revenue reports, top rooms, and payment history")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/reports/summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTING', 'MANAGER')")
    @Operation(summary = "Get operational & revenue summary")
    public ResponseEntity<ApiResponse<ReportSummaryResponse>> getSummary() {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getSummary()));
    }

    @GetMapping("/payments")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTING', 'MANAGER')")
    @Operation(summary = "List payment transactions with pagination and date/branch filters")
    public ResponseEntity<ApiResponse<Page<PaymentRecordResponse>>> listPayments(
            @RequestParam(required = false) Integer hotelId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.listPayments(hotelId, from, to, principal, pageable)));
    }

    @GetMapping("/reports/revenue")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTING', 'MANAGER')")
    @Operation(summary = "Get revenue report by date range and hotel branch")
    public ResponseEntity<ApiResponse<RevenueReportResponse>> getRevenueReport(
            @RequestParam(required = false) Integer hotelId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getRevenueReport(hotelId, from, to, principal)));
    }

    @GetMapping("/reports/top-rooms")
    @PreAuthorize("hasAnyRole('ADMIN', 'ACCOUNTING', 'MANAGER')")
    @Operation(summary = "Get top booked rooms")
    public ResponseEntity<ApiResponse<List<TopRoomReportResponse>>> getTopRooms(
            @RequestParam(defaultValue = "5") int limit
    ) {
        return ResponseEntity.ok(ApiResponse.ok(reportService.getTopRooms(limit)));
    }
}
