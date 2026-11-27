package com.spotkihotel.controller;

import com.spotkihotel.dto.ApiResponse;
import com.spotkihotel.dto.auth.AuthDtos.*;
import com.spotkihotel.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Customer and Admin/Staff JWT authentication endpoints")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/customer/register")
    @Operation(summary = "Register a new customer account")
    public ResponseEntity<ApiResponse<AuthResponse>> registerCustomer(@Valid @RequestBody CustomerRegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Customer registered successfully", authService.registerCustomer(request)));
    }

    @PostMapping("/customer/login")
    @Operation(summary = "Login as a customer and receive JWT")
    public ResponseEntity<ApiResponse<AuthResponse>> loginCustomer(@Valid @RequestBody CustomerLoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Login successful", authService.loginCustomer(request)));
    }

    @PostMapping("/admin/login")
    @Operation(summary = "Login as admin/staff (admin, manager, reception, accounting, housekeeping)")
    public ResponseEntity<ApiResponse<AuthResponse>> loginAdmin(@Valid @RequestBody AdminLoginRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Staff login successful", authService.loginAdmin(request)));
    }
}
