package com.spotkihotel.controller;

import com.spotkihotel.dto.ApiResponse;
import com.spotkihotel.dto.staff.StaffDtos.*;
import com.spotkihotel.entity.enums.StaffRole;
import com.spotkihotel.security.UserPrincipal;
import com.spotkihotel.service.StaffService;
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

@RestController
@RequestMapping("/api/v1/admin/staff")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
@Tag(name = "Staff Management", description = "Admin & Branch Manager staff account management")
public class AdminStaffController {

    private final StaffService staffService;

    @GetMapping
    @Operation(summary = "List staff accounts (scoped by branch for managers)")
    public ResponseEntity<ApiResponse<Page<StaffResponse>>> listStaff(
            @RequestParam(required = false) Integer hotelId,
            @RequestParam(required = false) StaffRole role,
            @RequestParam(required = false) String keyword,
            @AuthenticationPrincipal UserPrincipal principal,
            @PageableDefault(size = 15) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(staffService.listStaff(hotelId, role, keyword, principal, pageable)));
    }

    @PostMapping
    @Operation(summary = "Create a new staff account")
    public ResponseEntity<ApiResponse<StaffResponse>> createStaff(
            @Valid @RequestBody CreateStaffRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Staff created", staffService.createStaff(request, principal)));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Update staff profile, role, branch, password, or active status")
    public ResponseEntity<ApiResponse<StaffResponse>> updateStaff(
            @PathVariable Integer id,
            @Valid @RequestBody UpdateStaffRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Staff updated", staffService.updateStaff(id, request, principal)));
    }
}
