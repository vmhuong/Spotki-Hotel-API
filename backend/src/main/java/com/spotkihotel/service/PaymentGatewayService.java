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
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class PaymentGatewayService {

    private final PaymentGatewayTransactionRepository gatewayRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    @Value("${app.jwt.secret}")
    private String hmacSecret;

    @Value("${app.vietqr.bank-id:MB}")
    private String vietqrBankId;

    @Value("${app.vietqr.account-no:0389833822}")
    private String vietqrAccountNo;

    @Value("${app.vietqr.account-name:SPOTKI HOTEL}")
    private String vietqrAccountName;

    @Value("${app.vietqr.template:compact2}")
    private String vietqrTemplate;

    @Value("${app.vietqr.webhook-api-key:}")
    private String vietqrWebhookApiKey;

    @Transactional
    public InitiateGatewayPaymentResponse initiatePayment(InitiateGatewayPaymentRequest request, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + request.getBookingId()));

        if ("CUSTOMER".equals(principal.getUserType()) && !booking.getGuest().getId().equals(principal.getId())) {
            throw new UnauthorizedException("You can only initiate payment for your own booking.");
        }

        String provider = request.getProvider().trim().toUpperCase();
        String appTransId = provider + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
        String orderUrl = "https://sandbox.spotkihotel.vn/pay/" + provider.toLowerCase() + "/" + appTransId;
        String transferContent = booking.getBookingCode() + " " + appTransId;
        String qrImageUrl = buildVietQrUrl(request.getAmount(), transferContent);

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
                .qrImageUrl(qrImageUrl)
                .bankId(vietqrBankId)
                .accountNo(vietqrAccountNo)
                .accountName(vietqrAccountName)
                .transferContent(transferContent)
                .bookingCode(booking.getBookingCode())
                .build();
    }

    @Transactional(readOnly = true)
    public GatewayStatusResponse getGatewayStatus(String appTransId) {
        PaymentGatewayTransaction tx = gatewayRepository.findByAppTransId(appTransId.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Gateway transaction not found: " + appTransId));
        return GatewayStatusResponse.builder()
                .appTransId(tx.getAppTransId())
                .status(tx.getStatus())
                .paymentId(tx.getPayment() != null ? tx.getPayment().getId() : null)
                .paidAt(tx.getPaidAt())
                .amount(tx.getAmount())
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

        String methodLabel = "VIETQR".equalsIgnoreCase(provider)
                ? "Chuyen khoan VietQR"
                : "Online Gateway - " + provider;

        Payment payment = paymentRepository.save(Payment.builder()
                .booking(tx.getBooking())
                .amount(tx.getAmount())
                .method(methodLabel)
                .payerName(tx.getBooking().getContactName() != null ? tx.getBooking().getContactName() : tx.getBooking().getGuest().getFullName())
                .note("Webhook Tx: " + request.getGatewayTransId() + " (" + tx.getAppTransId() + ")")
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

    @Transactional
    public GatewayCallbackResponse handleVietQrWebhook(VietQrWebhookRequest request) {
        return handleVietQrWebhook(request, null, null);
    }

    @Transactional
    public GatewayCallbackResponse handleVietQrWebhook(
            VietQrWebhookRequest request,
            String authHeader,
            String webhookSecretHeader
    ) {
        verifyWebhookApiKeyIfConfigured(authHeader, webhookSecretHeader);
        BigDecimal paidAmount = request.getTransferAmount() != null ? request.getTransferAmount() : request.getAmount();
        if (paidAmount == null || paidAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException("Invalid webhook transfer amount.");
        }

        String textBlob = String.join(" ",
                request.getAppTransId() != null ? request.getAppTransId() : "",
                request.getContent() != null ? request.getContent() : "",
                request.getDescription() != null ? request.getDescription() : ""
        ).toUpperCase();

        PaymentGatewayTransaction tx = null;
        if (request.getAppTransId() != null && !request.getAppTransId().isBlank()) {
            tx = gatewayRepository.findByAppTransId(request.getAppTransId().trim()).orElse(null);
        }
        if (tx == null) {
            Matcher m = Pattern.compile("(VIETQR-[A-Z0-9-]{6,20})").matcher(textBlob);
            if (m.find()) {
                tx = gatewayRepository.findByAppTransId(m.group(1)).orElse(null);
            }
        }
        if (tx == null) {
            Matcher compactMatcher = Pattern.compile("VIETQR([A-Z0-9]{8,14})").matcher(textBlob.replaceAll("[^A-Z0-9]", ""));
            if (compactMatcher.find()) {
                tx = gatewayRepository.findByAppTransId("VIETQR-" + compactMatcher.group(1)).orElse(null);
            }
        }

        String refId = request.getReferenceCode() != null && !request.getReferenceCode().isBlank()
                ? request.getReferenceCode()
                : (request.getId() != null ? request.getId() : "WEBHOOK-" + System.currentTimeMillis());

        if (tx != null) {
            if ("paid".equalsIgnoreCase(tx.getStatus())) {
                return GatewayCallbackResponse.builder()
                        .appTransId(tx.getAppTransId())
                        .status("paid")
                        .idempotentReplay(true)
                        .paymentId(tx.getPayment() != null ? tx.getPayment().getId() : null)
                        .paidAt(tx.getPaidAt())
                        .build();
            }
            Payment payment = paymentRepository.save(Payment.builder()
                    .booking(tx.getBooking())
                    .amount(paidAmount)
                    .method("Chuyen khoan VietQR")
                    .payerName(tx.getBooking().getContactName() != null ? tx.getBooking().getContactName() : tx.getBooking().getGuest().getFullName())
                    .note("VietQR Webhook: " + refId + " (" + tx.getAppTransId() + ")")
                    .build());
            LocalDateTime paidAt = LocalDateTime.now();
            tx.setStatus("paid");
            tx.setGatewayTransId(refId);
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

        String bookingCode = request.getBookingCode();
        if (bookingCode == null || bookingCode.isBlank()) {
            Matcher m = Pattern.compile("(BK-[A-Z0-9]+)").matcher(textBlob);
            if (m.find()) bookingCode = m.group(1);
        }
        if (bookingCode == null || bookingCode.isBlank()) {
            throw new ResourceNotFoundException("No matching pending VietQR transaction or booking code found in webhook payload.");
        }

        final String resolvedBookingCode = bookingCode.trim();
        Booking booking = bookingRepository.findByBookingCode(resolvedBookingCode)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + resolvedBookingCode));

        Payment payment = paymentRepository.save(Payment.builder()
                .booking(booking)
                .amount(paidAmount)
                .method("Chuyen khoan VietQR")
                .payerName(booking.getContactName() != null ? booking.getContactName() : booking.getGuest().getFullName())
                .note("VietQR Webhook: " + refId)
                .build());

        return GatewayCallbackResponse.builder()
                .appTransId(bookingCode)
                .status("paid")
                .idempotentReplay(false)
                .paymentId(payment.getId())
                .paidAt(payment.getPaidAt())
                .build();
    }

    private void verifyWebhookApiKeyIfConfigured(String authHeader, String webhookSecretHeader) {
        if (vietqrWebhookApiKey == null || vietqrWebhookApiKey.isBlank()) {
            return;
        }
        String supplied = null;
        if (webhookSecretHeader != null && !webhookSecretHeader.isBlank()) {
            supplied = webhookSecretHeader.trim();
        } else if (authHeader != null && !authHeader.isBlank()) {
            String trimmed = authHeader.trim();
            if (trimmed.regionMatches(true, 0, "Apikey ", 0, 7)) {
                supplied = trimmed.substring(7).trim();
            } else if (trimmed.regionMatches(true, 0, "Bearer ", 0, 7)) {
                supplied = trimmed.substring(7).trim();
            } else {
                supplied = trimmed;
            }
        }
        if (supplied == null || !MessageDigest.isEqual(
                vietqrWebhookApiKey.trim().getBytes(StandardCharsets.UTF_8),
                supplied.getBytes(StandardCharsets.UTF_8)
        )) {
            throw new UnauthorizedException("Invalid VietQR webhook API key.");
        }
    }

    private String buildVietQrUrl(BigDecimal amount, String transferContent) {
        long amt = amount.setScale(0, java.math.RoundingMode.HALF_UP).longValue();
        return String.format(
                "https://img.vietqr.io/image/%s-%s-%s.png?amount=%d&addInfo=%s&accountName=%s",
                vietqrBankId,
                vietqrAccountNo,
                vietqrTemplate,
                amt,
                URLEncoder.encode(transferContent, StandardCharsets.UTF_8),
                URLEncoder.encode(vietqrAccountName, StandardCharsets.UTF_8)
        );
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
