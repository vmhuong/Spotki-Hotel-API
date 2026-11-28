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

    @PostMapping("/admin/bookings/walk-in")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION')")
    @Operation(summary = "Create a walk-in booking at front desk with optional immediate check-in")
    public ResponseEntity<ApiResponse<BookingResponse>> createWalkInBooking(
            @Valid @RequestBody WalkInBookingRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Walk-in booking created", bookingService.createWalkInBooking(request, principal)));
    }

    @PutMapping("/admin/bookings/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION')")
    @Operation(summary = "Update a pending ('booked') booking's room, dates/hours, guests, or contact info")
    public ResponseEntity<ApiResponse<BookingResponse>> adminUpdateBooking(
            @PathVariable Integer id,
            @Valid @RequestBody AdminUpdateBookingRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Booking updated", bookingService.adminUpdateBooking(id, request, principal)));
    }

    @GetMapping("/bookings/lookup")
    @Operation(summary = "Lookup a guest booking by bookingCode and contact phone")
    public ResponseEntity<ApiResponse<BookingResponse>> lookupBooking(
            @RequestParam String bookingCode,
            @RequestParam String phone
    ) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.lookupBooking(bookingCode, phone)));
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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION', 'ACCOUNTING', 'HOUSEKEEPING')")
    @Operation(summary = "List bookings for admin/staff (scoped by branch for non-admin)")
    public ResponseEntity<ApiResponse<Page<BookingResponse>>> adminListBookings(
            @RequestParam(required = false) Integer hotelId,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) String keyword,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 15) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(bookingService.adminListBookings(hotelId, status, keyword, principal, pageable)));
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
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION', 'ACCOUNTING')")
    @Operation(summary = "Add room service to a booking")
    public ResponseEntity<ApiResponse<BookingServiceItemResponse>> addService(
            @PathVariable Integer id,
            @Valid @RequestBody AddServiceRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Service added", bookingService.addServiceToBooking(id, request, principal)));
    }

    @DeleteMapping("/admin/bookings/{id}/services/{itemId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION', 'ACCOUNTING')")
    @Operation(summary = "Remove a service item from a booking before final checkout")
    public ResponseEntity<ApiResponse<InvoiceSummaryResponse>> removeService(
            @PathVariable Integer id,
            @PathVariable Integer itemId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Service removed", bookingService.removeServiceFromBooking(id, itemId, principal)));
    }

    @PostMapping("/admin/bookings/{id}/payments")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION', 'ACCOUNTING')")
    @Operation(summary = "Record a payment for a booking (Cash, Card, Points with member verification)")
    public ResponseEntity<ApiResponse<PaymentResponse>> recordPayment(
            @PathVariable Integer id,
            @Valid @RequestBody RecordPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Payment recorded", bookingService.recordPayment(id, request, principal)));
    }

    @DeleteMapping("/admin/bookings/{id}/payments/{paymentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION', 'ACCOUNTING')")
    @Operation(summary = "Remove a non-bank-transfer payment before final checkout (refunds loyalty points if applicable)")
    public ResponseEntity<ApiResponse<InvoiceSummaryResponse>> removePayment(
            @PathVariable Integer id,
            @PathVariable Integer paymentId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Payment removed", bookingService.removePaymentFromBooking(id, paymentId, principal)));
    }

    @PostMapping("/admin/bookings/{id}/member")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION', 'ACCOUNTING')")
    @Operation(summary = "Attach/verify a member guest profile onto an active booking bill by guestId or phone/CCCD")
    public ResponseEntity<ApiResponse<InvoiceSummaryResponse>> attachMember(
            @PathVariable Integer id,
            @RequestBody AttachMemberRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Member linked to booking", bookingService.attachMemberToBooking(id, request, principal)));
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
