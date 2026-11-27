package com.spotkihotel.service;

import com.spotkihotel.dto.booking.BookingDtos.*;
import com.spotkihotel.entity.*;
import com.spotkihotel.entity.enums.*;
import com.spotkihotel.exception.BusinessException;
import com.spotkihotel.exception.ConflictException;
import com.spotkihotel.exception.ResourceNotFoundException;
import com.spotkihotel.exception.UnauthorizedException;
import com.spotkihotel.repository.*;
import com.spotkihotel.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final GuestRepository guestRepository;
    private final HotelServiceRepository hotelServiceRepository;
    private final BookingServiceItemRepository bookingServiceItemRepository;
    private final PaymentRepository paymentRepository;
    private final SecurityLogService securityLogService;

    @Value("${app.hotel.vat-rate:0.08}")
    private BigDecimal vatRate;

    @Value("${app.hotel.deposit-rate:0.50}")
    private BigDecimal depositRate;

    @Value("${app.hotel.loyalty-vnd-per-point:10000}")
    private int loyaltyVndPerPoint;

    @Transactional
    public BookingResponse createBooking(CreateBookingRequest request, UserPrincipal principal) {
        validateDates(request.getCheckIn(), request.getCheckOut(), request.getPricingMode());

        Room room = roomRepository.findByIdForUpdate(request.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + request.getRoomId()));

        if (!Boolean.TRUE.equals(room.getIsActive()) || room.getStatus() == RoomStatus.maintenance) {
            throw new BusinessException("Room is currently unavailable for booking.");
        }

        long overlaps = bookingRepository.countOverlappingBookings(room.getId(), -1, request.getCheckIn(), request.getCheckOut());
        if (overlaps > 0) {
            throw new ConflictException("Room is already booked for the selected dates.");
        }

        Guest guest = resolveGuest(request, principal);
        String bookingCode = "BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Booking booking = bookingRepository.save(Booking.builder()
                .bookingCode(bookingCode)
                .guest(guest)
                .room(room)
                .checkIn(request.getCheckIn())
                .checkOut(request.getCheckOut())
                .pricingMode(request.getPricingMode())
                .contactName(request.getContactName().trim())
                .contactPhone(request.getContactPhone().trim())
                .adults(request.getAdults())
                .children(request.getChildren())
                .status(BookingStatus.booked)
                .note(request.getNote())
                .packageSnapshot(room.getPackageName())
                .build());

        BigDecimal estimatedRoomTotal = calculateRoomTotalWithSurcharge(booking, room);
        BigDecimal depositAmount = estimatedRoomTotal.multiply(depositRate).setScale(0, RoundingMode.HALF_UP);

        Payment deposit = paymentRepository.save(Payment.builder()
                .booking(booking)
                .amount(depositAmount)
                .method("Da coc 50% - " + request.getPaymentMethod())
                .payerName(request.getContactName())
                .note(request.getTransactionRef() != null ? "Ref: " + request.getTransactionRef() : "50% online deposit")
                .build());

        ActorType actorType = principal != null && "CUSTOMER".equals(principal.getUserType())
                ? ActorType.customer : ActorType.guest;
        Integer actorId = principal != null ? principal.getId() : guest.getId();

        securityLogService.log(actorType, actorId, "booking_create", "success",
                "Created booking " + bookingCode + " for room " + room.getRoomNumber());

        return toBookingResponse(booking);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getMyBookings(UserPrincipal principal) {
        if (principal == null || !"CUSTOMER".equals(principal.getUserType())) {
            throw new UnauthorizedException("Customer authentication required.");
        }
        return bookingRepository.findByGuestIdOrderByCreatedAtDesc(principal.getId())
                .stream()
                .map(this::toBookingResponse)
                .toList();
    }

    @Transactional
    public BookingResponse customerEditBooking(Integer bookingId, CustomerEditBookingRequest request, UserPrincipal principal) {
        Booking booking = getOwnedBooking(bookingId, principal);

        if (booking.getStatus() != BookingStatus.booked) {
            throw new BusinessException("Only bookings with status 'booked' can be modified.");
        }
        if (booking.getCustomerEditCount() >= 1) {
            throw new BusinessException("Customer can only edit a booking once.");
        }
        validateDates(request.getCheckIn(), request.getCheckOut(), booking.getPricingMode());

        Room room = roomRepository.findByIdForUpdate(booking.getRoom().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + booking.getRoom().getId()));

        long overlaps = bookingRepository.countOverlappingBookings(
                room.getId(), booking.getId(), request.getCheckIn(), request.getCheckOut());
        if (overlaps > 0) {
            throw new ConflictException("Room is not available for the updated dates.");
        }

        booking.setCheckIn(request.getCheckIn());
        booking.setCheckOut(request.getCheckOut());
        booking.setAdults(request.getAdults());
        booking.setChildren(request.getChildren());
        booking.setNote(request.getNote());
        booking.setCustomerEditCount(booking.getCustomerEditCount() + 1);
        booking.setCustomerEditedAt(LocalDateTime.now());

        Booking saved = bookingRepository.save(booking);
        return toBookingResponse(saved);
    }

    @Transactional
    public BookingResponse cancelBooking(Integer bookingId, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));

        if ("CUSTOMER".equals(principal.getUserType()) && !booking.getGuest().getId().equals(principal.getId())) {
            throw new UnauthorizedException("You can only cancel your own booking.");
        }
        if ("ADMIN".equals(principal.getUserType())) {
            enforceHotelScope(principal, booking.getRoom());
        }
        if (booking.getStatus() != BookingStatus.booked) {
            throw new BusinessException("Only bookings with status 'booked' can be cancelled.");
        }

        booking.setStatus(BookingStatus.cancelled);
        Booking saved = bookingRepository.save(booking);
        return toBookingResponse(saved);
    }

    @Transactional(readOnly = true)
    public Page<BookingResponse> adminListBookings(Integer hotelId, BookingStatus status, UserPrincipal principal, Pageable pageable) {
        Integer scopedHotelId = principal.isAdminOrGlobalStaff() ? hotelId : principal.getHotelId();
        org.springframework.data.jpa.domain.Specification<Booking> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
            if (scopedHotelId != null) {
                predicates.add(cb.equal(root.get("room").get("hotel").get("id"), scopedHotelId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        return bookingRepository.findAll(spec, pageable).map(this::toBookingResponse);
    }

    @Transactional
    public BookingResponse checkIn(Integer bookingId, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        enforceHotelScope(principal, booking.getRoom());

        if (booking.getStatus() != BookingStatus.booked) {
            throw new BusinessException("Booking must be in 'booked' status to check in.");
        }

        booking.setStatus(BookingStatus.checked_in);
        booking.setCheckInAt(LocalDateTime.now());
        booking.getRoom().setStatus(RoomStatus.occupied);
        roomRepository.save(booking.getRoom());
        Booking saved = bookingRepository.save(booking);
        return toBookingResponse(saved);
    }

    @Transactional
    public BookingServiceItemResponse addServiceToBooking(Integer bookingId, AddServiceRequest request, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        enforceHotelScope(principal, booking.getRoom());

        if (booking.getStatus() != BookingStatus.checked_in && booking.getStatus() != BookingStatus.booked) {
            throw new BusinessException("Cannot add services to a checked-out or cancelled booking.");
        }

        HotelService service = hotelServiceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + request.getServiceId()));

        BookingServiceItem item = bookingServiceItemRepository.save(BookingServiceItem.builder()
                .booking(booking)
                .service(service)
                .quantity(request.getQuantity())
                .price(service.getPrice())
                .build());

        return BookingServiceItemResponse.builder()
                .id(item.getId())
                .bookingId(booking.getId())
                .serviceId(service.getId())
                .serviceName(service.getServiceName())
                .quantity(item.getQuantity())
                .unitPrice(item.getPrice())
                .lineTotal(item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .createdAt(item.getCreatedAt())
                .build();
    }

    @Transactional
    public PaymentResponse recordPayment(Integer bookingId, RecordPaymentRequest request, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        enforceHotelScope(principal, booking.getRoom());

        Payment payment = paymentRepository.save(Payment.builder()
                .booking(booking)
                .amount(request.getAmount())
                .method(request.getMethod())
                .payerName(request.getPayerName() != null ? request.getPayerName() : booking.getGuest().getFullName())
                .cashierName(principal.getUsername())
                .adminId(principal.getId())
                .note(request.getNote())
                .build());

        return PaymentResponse.builder()
                .id(payment.getId())
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .amount(payment.getAmount())
                .method(payment.getMethod())
                .paidAt(payment.getPaidAt())
                .payerName(payment.getPayerName())
                .cashierName(payment.getCashierName())
                .note(payment.getNote())
                .build();
    }

    @Transactional
    public InvoiceSummaryResponse checkOut(Integer bookingId, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        enforceHotelScope(principal, booking.getRoom());

        if (booking.getStatus() != BookingStatus.checked_in) {
            throw new BusinessException("Booking must be in 'checked_in' status to check out.");
        }

        InvoiceSummaryResponse invoice = buildInvoiceSummary(booking);

        booking.setStatus(BookingStatus.checked_out);
        booking.setCheckedOutAt(LocalDateTime.now());

        int pointsEarned = 0;
        if (booking.getLoyaltyAwardedAt() == null && invoice.getGrandTotal().compareTo(BigDecimal.ZERO) > 0) {
            pointsEarned = invoice.getGrandTotal()
                    .divide(BigDecimal.valueOf(loyaltyVndPerPoint), 0, RoundingMode.FLOOR)
                    .intValue();
            if (pointsEarned > 0) {
                Guest guest = booking.getGuest();
                guest.setLoyaltyPoints(guest.getLoyaltyPoints() + pointsEarned);
                guestRepository.save(guest);
                booking.setLoyaltyAwardedAt(LocalDateTime.now());
            }
        }
        invoice.setLoyaltyPointsEarned(pointsEarned);

        Room room = booking.getRoom();
        room.setStatus(RoomStatus.cleaning);
        room.setHousekeepingStatus(HousekeepingStatus.pending);
        roomRepository.save(room);
        bookingRepository.save(booking);
        return invoice;
    }

    @Transactional(readOnly = true)
    public InvoiceSummaryResponse getInvoiceSummary(Integer bookingId, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        if (principal == null) {
            throw new UnauthorizedException("Authentication required.");
        }
        if ("CUSTOMER".equals(principal.getUserType())) {
            if (!booking.getGuest().getId().equals(principal.getId())) {
                throw new UnauthorizedException("You can only view your own booking invoice.");
            }
        } else {
            enforceHotelScope(principal, booking.getRoom());
        }
        return buildInvoiceSummary(booking);
    }

    public InvoiceSummaryResponse buildInvoiceSummary(Booking booking) {
        Room room = booking.getRoom();
        BigDecimal baseRoomCharge = calculateBaseRoomCharge(booking, room);
        BigDecimal extraSurcharge = calculateExtraGuestSurcharge(booking, room, baseRoomCharge);

        BigDecimal serviceCharge = bookingServiceItemRepository.findByBookingIdOrderByCreatedAtAsc(booking.getId())
                .stream()
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal subtotal = baseRoomCharge.add(extraSurcharge).add(serviceCharge);
        BigDecimal vatAmount = subtotal.multiply(vatRate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal grandTotal = subtotal.add(vatAmount);
        BigDecimal totalPaid = paymentRepository.sumPaidByBookingId(booking.getId());
        BigDecimal remaining = grandTotal.subtract(totalPaid).max(BigDecimal.ZERO);

        return InvoiceSummaryResponse.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .roomCharge(baseRoomCharge)
                .extraGuestSurcharge(extraSurcharge)
                .serviceCharge(serviceCharge)
                .subtotal(subtotal)
                .vatAmount(vatAmount)
                .grandTotal(grandTotal)
                .totalPaid(totalPaid)
                .remainingBalance(remaining)
                .loyaltyPointsEarned(0)
                .build();
    }

    private BigDecimal calculateBaseRoomCharge(Booking booking, Room room) {
        if (booking.getPricingMode() == PricingMode.hour) {
            return room.getHourlyRate();
        }
        long nights = Math.max(1, ChronoUnit.DAYS.between(booking.getCheckIn(), booking.getCheckOut()));
        return room.getPricePerNight().multiply(BigDecimal.valueOf(nights));
    }

    private BigDecimal calculateExtraGuestSurcharge(Booking booking, Room room, BigDecimal baseRoomCharge) {
        int totalGuests = booking.getAdults() + booking.getChildren();
        if (totalGuests <= room.getCapacity()) {
            return BigDecimal.ZERO;
        }
        int extraGuests = totalGuests - room.getCapacity();
        BigDecimal rate = room.getExtraGuestRatePercent().divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
        return baseRoomCharge.multiply(rate).multiply(BigDecimal.valueOf(extraGuests)).setScale(0, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateRoomTotalWithSurcharge(Booking booking, Room room) {
        BigDecimal base = calculateBaseRoomCharge(booking, room);
        return base.add(calculateExtraGuestSurcharge(booking, room, base));
    }

    private void validateDates(LocalDate checkIn, LocalDate checkOut, PricingMode mode) {
        if (mode == PricingMode.night && !checkOut.isAfter(checkIn)) {
            throw new BusinessException("checkOut date must be after checkIn date for nightly bookings.");
        }
        if (mode == PricingMode.hour && checkOut.isBefore(checkIn)) {
            throw new BusinessException("checkOut date cannot be before checkIn date.");
        }
    }

    private Guest resolveGuest(CreateBookingRequest request, UserPrincipal principal) {
        if (principal != null && "CUSTOMER".equals(principal.getUserType())) {
            return guestRepository.findById(principal.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Customer profile not found."));
        }
        if (request.getContactEmail() != null && !request.getContactEmail().isBlank()) {
            return guestRepository.findByEmailIgnoreCase(request.getContactEmail().trim())
                    .orElseGet(() -> createWalkInGuest(request));
        }
        return guestRepository.findByPhone(request.getContactPhone().trim())
                .orElseGet(() -> createWalkInGuest(request));
    }

    private Guest createWalkInGuest(CreateBookingRequest request) {
        return guestRepository.save(Guest.builder()
                .fullName(request.getContactName().trim())
                .phone(request.getContactPhone().trim())
                .email(request.getContactEmail() != null ? request.getContactEmail().trim().toLowerCase() : null)
                .customerIsActive(true)
                .build());
    }

    private Booking getOwnedBooking(Integer bookingId, UserPrincipal principal) {
        if (principal == null || !"CUSTOMER".equals(principal.getUserType())) {
            throw new UnauthorizedException("Customer authentication required.");
        }
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        if (!booking.getGuest().getId().equals(principal.getId())) {
            throw new UnauthorizedException("You can only modify your own booking.");
        }
        return booking;
    }

    private void enforceHotelScope(UserPrincipal principal, Room room) {
        if (!principal.isAdminOrGlobalStaff() && room.getHotel() != null
                && !principal.getHotelId().equals(room.getHotel().getId())) {
            throw new UnauthorizedException("You do not have access to this hotel branch.");
        }
    }

    public BookingResponse toBookingResponse(Booking booking) {
        Room room = booking.getRoom();
        BigDecimal estimated = calculateRoomTotalWithSurcharge(booking, room);
        BigDecimal deposit = estimated.multiply(depositRate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal paid = paymentRepository.sumPaidByBookingId(booking.getId());

        return BookingResponse.builder()
                .id(booking.getId())
                .bookingCode(booking.getBookingCode())
                .roomId(room.getId())
                .roomNumber(room.getRoomNumber())
                .roomType(room.getRoomType())
                .hotelId(room.getHotel() != null ? room.getHotel().getId() : null)
                .hotelName(room.getHotel() != null ? room.getHotel().getHotelName() : null)
                .guestId(booking.getGuest().getId())
                .guestName(booking.getGuest().getFullName())
                .checkIn(booking.getCheckIn())
                .checkOut(booking.getCheckOut())
                .pricingMode(booking.getPricingMode())
                .adults(booking.getAdults())
                .children(booking.getChildren())
                .status(booking.getStatus())
                .estimatedRoomTotal(estimated)
                .depositAmount(deposit)
                .totalPaid(paid)
                .customerEditCount(booking.getCustomerEditCount())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
