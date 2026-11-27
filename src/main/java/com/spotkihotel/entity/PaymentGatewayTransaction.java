package com.spotkihotel.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_gateway_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentGatewayTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_gateway_tx")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_booking", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_payment")
    private Payment payment;

    @Column(nullable = false, length = 40)
    private String provider;

    @Column(name = "app_trans_id", nullable = false, length = 80)
    private String appTransId;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "pending";

    @Column(name = "order_url", columnDefinition = "TEXT")
    private String orderUrl;

    @Column(name = "gateway_trans_id", length = 80)
    private String gatewayTransId;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
