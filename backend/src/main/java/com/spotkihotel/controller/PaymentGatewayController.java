package com.spotkihotel.controller;

import com.spotkihotel.dto.ApiResponse;
import com.spotkihotel.dto.payment.PaymentGatewayDtos.*;
import com.spotkihotel.security.UserPrincipal;
import com.spotkihotel.service.PaymentGatewayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments/gateway")
@RequiredArgsConstructor
@Tag(name = "Payment Gateway Webhook", description = "Sandbox online payment initiation and idempotent HMAC-verified webhook callback")
public class PaymentGatewayController {

    private final PaymentGatewayService paymentGatewayService;

    @PostMapping("/initiate")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Initiate a sandbox online payment (VietQR/ZaloPay) and get sample HMAC signature")
    public ResponseEntity<ApiResponse<InitiateGatewayPaymentResponse>> initiate(
            @Valid @RequestBody InitiateGatewayPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Payment initiated", paymentGatewayService.initiatePayment(request, principal)));
    }

    @GetMapping("/status/{appTransId}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Poll current status of a VietQR / gateway transaction")
    public ResponseEntity<ApiResponse<GatewayStatusResponse>> status(@PathVariable String appTransId) {
        return ResponseEntity.ok(ApiResponse.ok(paymentGatewayService.getGatewayStatus(appTransId)));
    }

    @PostMapping("/callback")
    @Operation(summary = "Idempotent payment webhook callback with HMAC-SHA256 verification")
    public ResponseEntity<ApiResponse<GatewayCallbackResponse>> callback(
            @Valid @RequestBody GatewayCallbackRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Callback processed", paymentGatewayService.handleCallback(request)));
    }

    @PostMapping("/vietqr-webhook")
    @Operation(summary = "VietQR bank transfer webhook receiver (auto-credits booking invoice by appTransId or bookingCode)")
    public ResponseEntity<ApiResponse<GatewayCallbackResponse>> vietqrWebhook(
            @RequestBody VietQrWebhookRequest request,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-Webhook-Secret", required = false) String webhookSecretHeader
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                "VietQR webhook processed",
                paymentGatewayService.handleVietQrWebhook(request, authHeader, webhookSecretHeader)
        ));
    }
}
