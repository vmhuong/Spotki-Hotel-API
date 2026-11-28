package com.spotkihotel.service;

import com.spotkihotel.dto.customer.CustomerDtos.*;
import com.spotkihotel.entity.Guest;
import com.spotkihotel.entity.enums.ActorType;
import com.spotkihotel.exception.BusinessException;
import com.spotkihotel.exception.ResourceNotFoundException;
import com.spotkihotel.repository.GuestRepository;
import com.spotkihotel.repository.PaymentRepository;
import com.spotkihotel.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private static final BigDecimal SILVER_SPENT_THRESHOLD = new BigDecimal("1000000");
    private static final BigDecimal GOLD_SPENT_THRESHOLD = new BigDecimal("5000000");
    private static final BigDecimal PLATINUM_SPENT_THRESHOLD = new BigDecimal("15000000");

    private final GuestRepository guestRepository;
    private final PaymentRepository paymentRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecurityLogService securityLogService;

    @Transactional(readOnly = true)
    public CustomerProfileResponse getProfile(UserPrincipal principal) {
        Guest guest = guestRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));
        return toProfileResponse(guest);
    }

    @Transactional
    public CustomerProfileResponse updateProfile(UpdateCustomerProfileRequest request, UserPrincipal principal) {
        Guest guest = guestRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));

        guest.setFullName(request.getFullName().trim());
        guest.setPhone(request.getPhone().trim());
        guest.setIdentityNo(request.getIdentityNo());
        guest.setAddress(request.getAddress());

        return toProfileResponse(guestRepository.save(guest));
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request, UserPrincipal principal) {
        Guest guest = guestRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));

        if (guest.getPasswordHash() == null
                || !passwordEncoder.matches(request.getCurrentPassword(), guest.getPasswordHash())) {
            throw new BusinessException("Current password is incorrect.");
        }

        guest.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        guestRepository.save(guest);
        securityLogService.log(ActorType.customer, guest.getId(), "customer_password_change", "success",
                "Customer changed password");
    }

    public static String resolveMembershipTier(BigDecimal totalSpent) {
        BigDecimal spent = totalSpent != null ? totalSpent : BigDecimal.ZERO;
        if (spent.compareTo(PLATINUM_SPENT_THRESHOLD) >= 0) return "Platinum";
        if (spent.compareTo(GOLD_SPENT_THRESHOLD) >= 0) return "Gold";
        if (spent.compareTo(SILVER_SPENT_THRESHOLD) >= 0) return "Silver";
        return "Bronze";
    }

    private CustomerProfileResponse toProfileResponse(Guest guest) {
        int pts = guest.getLoyaltyPoints() != null ? guest.getLoyaltyPoints() : 0;
        BigDecimal totalSpent = paymentRepository.sumTotalSpentByGuestId(guest.getId());
        if (totalSpent == null) {
            totalSpent = BigDecimal.ZERO;
        }
        String tier = resolveMembershipTier(totalSpent);
        return CustomerProfileResponse.builder()
                .id(guest.getId())
                .fullName(guest.getFullName())
                .phone(guest.getPhone())
                .email(guest.getEmail())
                .identityNo(guest.getIdentityNo())
                .address(guest.getAddress())
                .isVip(guest.getIsVip())
                .loyaltyPoints(pts)
                .totalSpent(totalSpent)
                .membershipTier(tier)
                .createdAt(guest.getCreatedAt())
                .build();
    }
}
