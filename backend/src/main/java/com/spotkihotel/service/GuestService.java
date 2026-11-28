package com.spotkihotel.service;

import com.spotkihotel.dto.booking.BookingDtos.BookingResponse;
import com.spotkihotel.dto.guest.GuestDtos.GuestResponse;
import com.spotkihotel.dto.guest.GuestDtos.UpsertGuestRequest;
import com.spotkihotel.entity.Guest;
import com.spotkihotel.exception.ConflictException;
import com.spotkihotel.exception.ResourceNotFoundException;
import com.spotkihotel.repository.BookingRepository;
import com.spotkihotel.repository.GuestRepository;
import com.spotkihotel.repository.PaymentRepository;
import com.spotkihotel.security.UserPrincipal;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GuestService {

    private final GuestRepository guestRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final BookingService bookingService;

    @Transactional(readOnly = true)
    public GuestResponse lookupByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new ResourceNotFoundException("Vui lòng nhập SĐT hoặc CCCD để xác thực thành viên.");
        }
        String clean = identifier.trim();
        Guest guest = guestRepository.findMatchingMembersByIdentifier(clean)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản thành viên khớp với: " + clean));
        return toResponse(guest);
    }

    @Transactional(readOnly = true)
    public Page<GuestResponse> searchGuests(String keyword, Boolean isVip, Pageable pageable) {
        Specification<Guest> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (isVip != null) {
                predicates.add(cb.equal(root.get("isVip"), isVip));
            }
            if (keyword != null && !keyword.isBlank()) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern),
                        cb.like(cb.lower(root.get("phone")), pattern),
                        cb.like(cb.lower(root.get("email")), pattern),
                        cb.like(cb.lower(root.get("identityNo")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<Guest> page = guestRepository.findAll(spec, pageable);
        List<Integer> guestIds = page.getContent().stream().map(Guest::getId).toList();
        Map<Integer, BigDecimal> spentMap = new HashMap<>();
        if (!guestIds.isEmpty()) {
            for (Object[] row : paymentRepository.sumTotalSpentByGuestIds(guestIds)) {
                spentMap.put((Integer) row[0], (BigDecimal) row[1]);
            }
        }
        return page.map(g -> toResponse(g, spentMap.getOrDefault(g.getId(), BigDecimal.ZERO)));
    }

    @Transactional
    public GuestResponse createGuest(UpsertGuestRequest request) {
        String cleanPhone = request.getPhone().trim();
        if (guestRepository.findByPhone(cleanPhone).isPresent()) {
            throw new ConflictException("Guest with this phone already exists: " + cleanPhone);
        }
        String cleanEmail = normalizeNullable(request.getEmail());
        if (cleanEmail != null && guestRepository.existsByEmailIgnoreCase(cleanEmail)) {
            throw new ConflictException("Guest with this email already exists: " + cleanEmail);
        }

        Guest guest = guestRepository.save(Guest.builder()
                .fullName(request.getFullName().trim())
                .phone(cleanPhone)
                .email(cleanEmail)
                .identityNo(normalizeNullable(request.getIdentityNo()))
                .address(normalizeNullable(request.getAddress()))
                .isVip(Boolean.TRUE.equals(request.getIsVip()))
                .customerIsActive(request.getCustomerIsActive() != null ? request.getCustomerIsActive() : true)
                .build());
        return toResponse(guest);
    }

    @Transactional
    public GuestResponse updateGuest(Integer guestId, UpsertGuestRequest request) {
        Guest guest = guestRepository.findById(guestId)
                .orElseThrow(() -> new ResourceNotFoundException("Guest not found: " + guestId));

        String cleanPhone = request.getPhone().trim();
        guestRepository.findByPhone(cleanPhone)
                .filter(existing -> !existing.getId().equals(guestId))
                .ifPresent(existing -> {
                    throw new ConflictException("Phone number is already used by another guest.");
                });

        String cleanEmail = normalizeNullable(request.getEmail());
        if (cleanEmail != null) {
            guestRepository.findByEmailIgnoreCase(cleanEmail)
                    .filter(existing -> !existing.getId().equals(guestId))
                    .ifPresent(existing -> {
                        throw new ConflictException("Email is already used by another guest.");
                    });
        }

        guest.setFullName(request.getFullName().trim());
        guest.setPhone(cleanPhone);
        guest.setEmail(cleanEmail);
        guest.setIdentityNo(normalizeNullable(request.getIdentityNo()));
        guest.setAddress(normalizeNullable(request.getAddress()));
        if (request.getIsVip() != null) {
            guest.setIsVip(request.getIsVip());
        }
        if (request.getCustomerIsActive() != null) {
            guest.setCustomerIsActive(request.getCustomerIsActive());
        }

        return toResponse(guestRepository.save(guest));
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

    private String normalizeNullable(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private GuestResponse toResponse(Guest guest) {
        BigDecimal totalSpent = paymentRepository.sumTotalSpentByGuestId(guest.getId());
        return toResponse(guest, totalSpent != null ? totalSpent : BigDecimal.ZERO);
    }

    private GuestResponse toResponse(Guest guest, BigDecimal totalSpent) {
        BigDecimal spent = totalSpent != null ? totalSpent : BigDecimal.ZERO;
        return GuestResponse.builder()
                .id(guest.getId())
                .fullName(guest.getFullName())
                .phone(guest.getPhone())
                .email(guest.getEmail())
                .identityNo(guest.getIdentityNo())
                .address(guest.getAddress())
                .isVip(guest.getIsVip())
                .loyaltyPoints(guest.getLoyaltyPoints())
                .totalSpent(spent)
                .membershipTier(CustomerService.resolveMembershipTier(spent))
                .customerIsActive(guest.getCustomerIsActive())
                .createdAt(guest.getCreatedAt())
                .build();
    }
}
