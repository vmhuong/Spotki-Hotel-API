package com.spotkihotel.controller;

import com.spotkihotel.dto.ApiResponse;
import com.spotkihotel.dto.auth.AuthDtos.*;
import com.spotkihotel.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Customer and Admin/Staff JWT authentication, refresh token, and Redis logout blacklist")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/customer/register")
    @Operation(summary = "Register a new customer account")
    public ResponseEntity<ApiResponse<AuthResponse>> registerCustomer(@Valid @RequestBody CustomerRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Customer registered successfully", authService.registerCustomer(request)));
    }

    @PostMapping("/customer/login")
    @Operation(summary = "Login as a customer and receive JWT + Refresh Token")
    public ResponseEntity<ApiResponse<AuthResponse>> loginCustomer(@Valid @RequestBody CustomerLoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Login successful", authService.loginCustomer(request)));
    }

    @PostMapping("/admin/login")
    @Operation(summary = "Login as admin/staff and receive JWT + Refresh Token")
    public ResponseEntity<ApiResponse<AuthResponse>> loginAdmin(@Valid @RequestBody AdminLoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Staff login successful", authService.loginAdmin(request)));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Rotate refresh token and issue a new access token")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Token refreshed", authService.refreshToken(request)));
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Logout, blacklist current access token in Redis, and revoke refresh token")
    public ResponseEntity<ApiResponse<Void>> logout(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader,
            @RequestBody(required = false) RefreshTokenRequest refreshRequest
    ) {
        authService.logout(authorizationHeader, refreshRequest);
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully", null));
    }
}
