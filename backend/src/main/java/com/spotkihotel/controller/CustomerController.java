package com.spotkihotel.controller;

import com.spotkihotel.dto.ApiResponse;
import com.spotkihotel.dto.customer.CustomerDtos.*;
import com.spotkihotel.security.UserPrincipal;
import com.spotkihotel.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/customers/me")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CUSTOMER')")
@Tag(name = "Customer Profile", description = "Authenticated customer profile, loyalty tier, and password management")
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    @Operation(summary = "Get current customer profile and loyalty tier")
    public ResponseEntity<ApiResponse<CustomerProfileResponse>> getProfile(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok(customerService.getProfile(principal)));
    }

    @PutMapping
    @Operation(summary = "Update current customer profile")
    public ResponseEntity<ApiResponse<CustomerProfileResponse>> updateProfile(
            @Valid @RequestBody UpdateCustomerProfileRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Profile updated", customerService.updateProfile(request, principal)));
    }

    @PatchMapping("/password")
    @Operation(summary = "Change customer password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        customerService.changePassword(request, principal);
        return ResponseEntity.ok(ApiResponse.ok("Password changed successfully", null));
    }
}
