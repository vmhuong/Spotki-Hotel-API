package com.spotkihotel.repository;

import com.spotkihotel.entity.PaymentGatewayTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentGatewayTransactionRepository extends JpaRepository<PaymentGatewayTransaction, Integer> {
    Optional<PaymentGatewayTransaction> findByProviderAndAppTransId(String provider, String appTransId);
}
