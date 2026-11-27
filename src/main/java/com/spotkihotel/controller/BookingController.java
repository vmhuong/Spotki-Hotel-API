package com.spotkihotel.controller;

import com.spotkihotel.dto.ApiResponse;
import com.spotkihotel.dto.booking.BookingDtos.*;
import com.spotkihotel.entity.enums.BookingStatus;
import com.spotkihotel.security.UserPrincipal;
import com.spotkihotel.service.BookingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Bookings & Billing", description = "Booking lifecycle, 50% deposit, services, payments, check-in/out, and VAT 8% invoicing")
public class BookingController {

    private final BookingService bookingService;

    @PostMapping("/bookings")
    @Operation(summary = "Create a new booking (public or authenticated customer) with automatic 50% deposit")
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(
            @Valid @RequestBody CreateBookingRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Booking created with 50% deposit", bookingService.createBooking(request, principal)));
    }

    @GetMapping("/bookings/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "List bookings of the authenticated customer")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMyBookings(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getMyBookings(principal)));
    }

    @PutMapping("/bookings/{id}/customer-edit")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Operation(summary = "Customer edits their booking (allowed once while status is 'booked')")
    public ResponseEntity<ApiResponse<BookingResponse>> customerEditBooking(
            @PathVariable Integer id,
            @Valid @RequestBody CustomerEditBookingRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Booking updated", bookingService.customerEditBooking(id, request, principal)));
    }

    @PostMapping("/bookings/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cancel a booking (Customer for own booking, or Staff)")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Booking cancelled", bookingService.cancelBooking(id, principal)));
    }

    @GetMapping("/admin/bookings")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION', 'ACCOUNTING')")
    @Operation(summary = "List bookings for admin/staff (scoped by branch for non-admin)")
    public ResponseEntity<ApiResponse<Page<BookingResponse>>> adminListBookings(
            @RequestParam(required = false) Integer hotelId,
            @RequestParam(required = false) BookingStatus status,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 15) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.adminListBookings(hotelId, status, principal, pageable)));
    }

    @PostMapping("/admin/bookings/{id}/check-in")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION')")
    @Operation(summary = "Check in a booked guest")
    public ResponseEntity<ApiResponse<BookingResponse>> checkIn(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Checked in successfully", bookingService.checkIn(id, principal)));
    }

    @PostMapping("/admin/bookings/{id}/services")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION')")
    @Operation(summary = "Add room service to a booking")
    public ResponseEntity<ApiResponse<BookingServiceItemResponse>> addService(
            @PathVariable Integer id,
            @Valid @RequestBody AddServiceRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Service added", bookingService.addServiceToBooking(id, request, principal)));
    }

    @PostMapping("/admin/bookings/{id}/payments")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION', 'ACCOUNTING')")
    @Operation(summary = "Record a payment for a booking")
    public ResponseEntity<ApiResponse<PaymentResponse>> recordPayment(
            @PathVariable Integer id,
            @Valid @RequestBody RecordPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Payment recorded", bookingService.recordPayment(id, request, principal)));
    }

    @PostMapping("/admin/bookings/{id}/check-out")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION', 'ACCOUNTING')")
    @Operation(summary = "Check out booking, calculate VAT 8% invoice, award loyalty points, and trigger housekeeping")
    public ResponseEntity<ApiResponse<InvoiceSummaryResponse>> checkOut(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Checked out successfully", bookingService.checkOut(id, principal)));
    }

    @GetMapping("/bookings/{id}/invoice")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get invoice summary for a booking")
    public ResponseEntity<ApiResponse<InvoiceSummaryResponse>> getInvoice(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getInvoiceSummary(id, principal)));
    }
}
