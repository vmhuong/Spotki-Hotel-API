package com.spotkihotel.controller;

import com.spotkihotel.dto.ApiResponse;
import com.spotkihotel.dto.booking.BookingDtos.BookingResponse;
import com.spotkihotel.dto.guest.GuestDtos.GuestResponse;
import com.spotkihotel.dto.guest.GuestDtos.UpsertGuestRequest;
import com.spotkihotel.security.UserPrincipal;
import com.spotkihotel.service.GuestService;
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
@RequestMapping("/api/v1/admin/guests")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION', 'ACCOUNTING')")
@Tag(name = "Guest Management", description = "Admin & Reception guest search, profile management, booking history, and VIP management")
public class AdminGuestController {

    private final GuestService guestService;

    @GetMapping("/lookup")
    @Operation(summary = "Verify and retrieve a member profile by phone number or identity number (CCCD)")
    public ResponseEntity<ApiResponse<GuestResponse>> lookupMember(@RequestParam String identifier) {
        return ResponseEntity.ok(ApiResponse.ok(guestService.lookupByIdentifier(identifier)));
    }

    @GetMapping
    @Operation(summary = "Search guests by name, phone, email, or identity number")
    public ResponseEntity<ApiResponse<Page<GuestResponse>>> searchGuests(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Boolean isVip,
            @PageableDefault(size = 15) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(guestService.searchGuests(keyword, isVip, pageable)));
    }

    @PostMapping
    @Operation(summary = "Create and save a new guest profile")
    public ResponseEntity<ApiResponse<GuestResponse>> createGuest(@Valid @RequestBody UpsertGuestRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Guest created", guestService.createGuest(request)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update guest profile details and status")
    public ResponseEntity<ApiResponse<GuestResponse>> updateGuest(
            @PathVariable Integer id,
            @Valid @RequestBody UpsertGuestRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Guest updated", guestService.updateGuest(id, request)));
    }

    @GetMapping("/{id}/bookings")
    @Operation(summary = "Get booking history of a guest (scoped by branch for non-admin)")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getGuestBookings(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(guestService.getGuestBookings(id, principal)));
    }

    @PatchMapping("/{id}/vip")
    @Operation(summary = "Mark or unmark a guest as VIP")
    public ResponseEntity<ApiResponse<GuestResponse>> updateVip(
            @PathVariable Integer id,
            @RequestParam boolean isVip
    ) {
        return ResponseEntity.ok(ApiResponse.ok("VIP status updated", guestService.updateVipStatus(id, isVip)));
    }
}
