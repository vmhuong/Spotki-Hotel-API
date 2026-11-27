package com.spotkihotel.service;

import com.spotkihotel.dto.payment.PaymentGatewayDtos.*;
import com.spotkihotel.entity.Booking;
import com.spotkihotel.entity.Payment;
import com.spotkihotel.entity.PaymentGatewayTransaction;
import com.spotkihotel.exception.BusinessException;
import com.spotkihotel.exception.ResourceNotFoundException;
import com.spotkihotel.exception.UnauthorizedException;
import com.spotkihotel.repository.BookingRepository;
import com.spotkihotel.repository.PaymentGatewayTransactionRepository;
import com.spotkihotel.repository.PaymentRepository;
import com.spotkihotel.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentGatewayService {

    private final PaymentGatewayTransactionRepository gatewayRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    @Value("${app.jwt.secret}")
    private String hmacSecret;

    @Transactional
    public InitiateGatewayPaymentResponse initiatePayment(InitiateGatewayPaymentRequest request, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + request.getBookingId()));

        if ("CUSTOMER".equals(principal.getUserType()) && !booking.getGuest().getId().equals(principal.getId())) {
            throw new UnauthorizedException("You can only initiate payment for your own booking.");
        }

        String provider = request.getProvider().trim().toUpperCase();
        String appTransId = provider + "-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        String orderUrl = "https://sandbox.spotkihotel.vn/pay/" + provider.toLowerCase() + "/" + appTransId;

        PaymentGatewayTransaction tx = gatewayRepository.save(PaymentGatewayTransaction.builder()
                .booking(booking)
                .provider(provider)
                .appTransId(appTransId)
                .amount(request.getAmount())
                .status("pending")
                .orderUrl(orderUrl)
                .build());

        String sampleMac = computeHmac(provider, appTransId, request.getAmount());

        return InitiateGatewayPaymentResponse.builder()
                .provider(tx.getProvider())
                .appTransId(tx.getAppTransId())
                .amount(tx.getAmount())
                .status(tx.getStatus())
                .orderUrl(tx.getOrderUrl())
                .sampleHmacSignature(sampleMac)
                .build();
    }

    @Transactional
    public GatewayCallbackResponse handleCallback(GatewayCallbackRequest request) {
        String provider = request.getProvider().trim().toUpperCase();
        PaymentGatewayTransaction tx = gatewayRepository.findByProviderAndAppTransId(provider, request.getAppTransId())
                .orElseThrow(() -> new ResourceNotFoundException("Gateway transaction not found: " + request.getAppTransId()));

        String expectedMac = computeHmac(provider, tx.getAppTransId(), request.getAmount());
        if (!expectedMac.equalsIgnoreCase(request.getMac())) {
            throw new UnauthorizedException("Invalid webhook HMAC signature.");
        }

        // Idempotency: if already paid, return existing result without double-crediting
        if ("paid".equalsIgnoreCase(tx.getStatus())) {
            return GatewayCallbackResponse.builder()
                    .appTransId(tx.getAppTransId())
                    .status(tx.getStatus())
                    .idempotentReplay(true)
                    .paymentId(tx.getPayment() != null ? tx.getPayment().getId() : null)
                    .paidAt(tx.getPaidAt())
                    .build();
        }

        if (tx.getAmount().compareTo(request.getAmount()) != 0) {
            throw new BusinessException("Callback amount mismatch.");
        }

        Payment payment = paymentRepository.save(Payment.builder()
                .booking(tx.getBooking())
                .amount(tx.getAmount())
                .method("Online Gateway - " + provider)
                .payerName(tx.getBooking().getGuest().getFullName())
                .note("Gateway Tx: " + request.getGatewayTransId() + " (" + tx.getAppTransId() + ")")
                .build());

        LocalDateTime paidAt = LocalDateTime.now();
        tx.setStatus("paid");
        tx.setGatewayTransId(request.getGatewayTransId());
        tx.setPayment(payment);
        tx.setPaidAt(paidAt);
        gatewayRepository.save(tx);

        return GatewayCallbackResponse.builder()
                .appTransId(tx.getAppTransId())
                .status("paid")
                .idempotentReplay(false)
                .paymentId(payment.getId())
                .paidAt(paidAt)
                .build();
    }

    public String computeHmac(String provider, String appTransId, BigDecimal amount) {
        try {
            String data = provider + "|" + appTransId + "|" + amount.stripTrailingZeros().toPlainString();
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute HMAC signature", e);
        }
    }
}
