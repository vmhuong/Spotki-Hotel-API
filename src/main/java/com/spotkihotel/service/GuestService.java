package com.spotkihotel.service;

import com.spotkihotel.dto.booking.BookingDtos.BookingResponse;
import com.spotkihotel.dto.guest.GuestDtos.GuestResponse;
import com.spotkihotel.entity.Guest;
import com.spotkihotel.exception.ResourceNotFoundException;
import com.spotkihotel.repository.BookingRepository;
import com.spotkihotel.repository.GuestRepository;
import com.spotkihotel.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GuestService {

    private final GuestRepository guestRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;

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

    @Transactional(readOnly = true)
    public List<BookingResponse> getGuestBookings(Integer guestId, UserPrincipal principal) {
        if (!guestRepository.existsById(guestId)) {
            throw new ResourceNotFoundException("Guest not found: " + guestId);
        }
        return bookingRepository.findByGuestIdOrderByCreatedAtDesc(guestId)
                .stream()
                .filter(b -> principal.isAdminOrGlobalStaff()
                        || (b.getRoom().getHotel() != null && principal.getHotelId().equals(b.getRoom().getHotel().getId())))
                .map(bookingService::toBookingResponse)
                .toList();
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
