package com.spotkihotel.controller;

import com.spotkihotel.dto.ApiResponse;
import com.spotkihotel.dto.guest.GuestDtos.GuestResponse;
import com.spotkihotel.service.GuestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/guests")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION')")
@Tag(name = "Guest Management", description = "Admin & Reception guest search and VIP management")
public class AdminGuestController {

    private final GuestService guestService;

    @GetMapping
    @Operation(summary = "Search guests by name, phone, or email")
    public ResponseEntity<ApiResponse<Page<GuestResponse>>> searchGuests(
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 15) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(guestService.searchGuests(keyword, pageable)));
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
