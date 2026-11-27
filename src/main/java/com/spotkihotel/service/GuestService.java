package com.spotkihotel.service;

import com.spotkihotel.dto.guest.GuestDtos.GuestResponse;
import com.spotkihotel.entity.Guest;
import com.spotkihotel.exception.ResourceNotFoundException;
import com.spotkihotel.repository.GuestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class GuestService {

    private final GuestRepository guestRepository;

    @Transactional(readOnly = true)
    public Page<GuestResponse> searchGuests(String keyword, Pageable pageable) {
        return guestRepository.searchGuests(keyword, pageable).map(this::toResponse);
    }

    @Transactional
    public GuestResponse updateVipStatus(Integer guestId, boolean isVip) {
        Guest guest = guestRepository.findById(guestId)
                .orElseThrow(() -> new ResourceNotFoundException("Guest not found: " + guestId));
        guest.setIsVip(isVip);
        return toResponse(guestRepository.save(guest));
    }

    private GuestResponse toResponse(Guest guest) {
        return GuestResponse.builder()
                .id(guest.getId())
                .fullName(guest.getFullName())
                .phone(guest.getPhone())
                .email(guest.getEmail())
                .identityNo(guest.getIdentityNo())
                .address(guest.getAddress())
                .isVip(guest.getIsVip())
                .loyaltyPoints(guest.getLoyaltyPoints())
                .customerIsActive(guest.getCustomerIsActive())
                .createdAt(guest.getCreatedAt())
                .build();
    }
}
