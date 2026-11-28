package com.spotkihotel.repository;

import com.spotkihotel.entity.PaymentGatewayTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentGatewayTransactionRepository extends JpaRepository<PaymentGatewayTransaction, Integer> {
    Optional<PaymentGatewayTransaction> findByProviderAndAppTransId(String provider, String appTransId);
    Optional<PaymentGatewayTransaction> findByAppTransId(String appTransId);
    Optional<PaymentGatewayTransaction> findFirstByGatewayTransId(String gatewayTransId);
    boolean existsByPaymentId(Integer paymentId);
    List<PaymentGatewayTransaction> findByBookingIdAndStatusOrderByCreatedAtDesc(Integer bookingId, String status);
}
