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
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final GuestRepository guestRepository;
    private final HotelServiceRepository hotelServiceRepository;
    private final BookingServiceItemRepository bookingServiceItemRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentGatewayTransactionRepository paymentGatewayTransactionRepository;
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

    @Transactional
    public BookingResponse createWalkInBooking(WalkInBookingRequest request, UserPrincipal principal) {
        PricingMode pricingMode = request.getPricingMode() != null ? request.getPricingMode() : PricingMode.night;

        Room room = roomRepository.findByIdForUpdate(request.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + request.getRoomId()));

        enforceHotelScope(principal, room);

        if (!Boolean.TRUE.equals(room.getIsActive()) || room.getStatus() == RoomStatus.maintenance) {
            throw new BusinessException("Room is currently unavailable for booking.");
        }
        if (request.isCheckInNow() && room.getStatus() == RoomStatus.occupied) {
            throw new ConflictException("Room is currently occupied and cannot check in immediately.");
        }

        LocalDate checkInDate = request.getCheckIn();
        LocalDate checkOutDate = request.getCheckOut();
        LocalDateTime startAt = request.getCheckInAt();
        LocalDateTime expectedOutAt = null;

        if (pricingMode == PricingMode.hour) {
            int hours = request.getDurationHours() != null && request.getDurationHours() > 0
                    ? request.getDurationHours() : 2;
            if (startAt == null) {
                startAt = checkInDate.equals(LocalDate.now())
                        ? LocalDateTime.now()
                        : checkInDate.atTime(14, 0);
            }
            expectedOutAt = startAt.plusHours(hours);
            checkInDate = startAt.toLocalDate();
            checkOutDate = expectedOutAt.toLocalDate();
            validateHourlyConflicts(room.getId(), -1, startAt, expectedOutAt);
        } else {
            validateDates(checkInDate, checkOutDate, pricingMode);
            long overlaps = bookingRepository.countOverlappingBookings(room.getId(), -1, checkInDate, checkOutDate);
            if (overlaps > 0) {
                throw new ConflictException("Room already has an overlapping booking for these dates.");
            }
            if (request.isCheckInNow()) {
                startAt = LocalDateTime.now();
            }
        }

        String cleanPhone = request.getContactPhone().trim();
        String cleanEmail = (request.getContactEmail() != null && !request.getContactEmail().isBlank())
                ? request.getContactEmail().trim().toLowerCase()
                : null;
        String cleanIdentity = (request.getIdentityNo() != null && !request.getIdentityNo().isBlank())
                ? request.getIdentityNo().trim()
                : null;
        String cleanAddress = (request.getAddress() != null && !request.getAddress().isBlank())
                ? request.getAddress().trim()
                : null;

        Guest guest = guestRepository.findByPhone(cleanPhone)
                .orElseGet(() -> Guest.builder()
                        .fullName(request.getContactName().trim())
                        .phone(cleanPhone)
                        .email(cleanEmail)
                        .identityNo(cleanIdentity)
                        .address(cleanAddress)
                        .customerIsActive(true)
                        .build());

        guest.setFullName(request.getContactName().trim());
        if (cleanEmail != null) guest.setEmail(cleanEmail);
        if (cleanIdentity != null) guest.setIdentityNo(cleanIdentity);
        if (cleanAddress != null) guest.setAddress(cleanAddress);
        guest = guestRepository.save(guest);

        String bookingCode = "BK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        boolean checkInNow = request.isCheckInNow();

        Booking booking = bookingRepository.save(Booking.builder()
                .bookingCode(bookingCode)
                .guest(guest)
                .room(room)
                .checkIn(checkInDate)
                .checkOut(checkOutDate)
                .checkInAt(startAt)
                .expectedCheckOutAt(expectedOutAt)
                .pricingMode(pricingMode)
                .contactName(request.getContactName().trim())
                .contactPhone(cleanPhone)
                .adults(request.getAdults())
                .children(request.getChildren())
                .status(checkInNow ? BookingStatus.checked_in : BookingStatus.booked)
                .note(request.getNote())
                .packageSnapshot(room.getPackageName())
                .build());

        if (checkInNow) {
            room.setStatus(RoomStatus.occupied);
            roomRepository.save(room);
        }

        BigDecimal estimatedRoomTotal = calculateRoomTotalWithSurcharge(booking, room);
        BigDecimal initialPaid = request.getDepositAmount() != null
                ? request.getDepositAmount()
                : estimatedRoomTotal.multiply(depositRate).setScale(0, RoundingMode.HALF_UP);

        if (initialPaid.compareTo(BigDecimal.ZERO) > 0) {
            paymentRepository.save(Payment.builder()
                    .booking(booking)
                    .amount(initialPaid)
                    .method(request.getPaymentMethod() != null ? request.getPaymentMethod() : "Tien mat")
                    .payerName(request.getContactName().trim())
                    .cashierName(principal.getUsername())
                    .adminId(principal.getId())
                    .note(checkInNow ? "Walk-in reception check-in payment" : "Walk-in booking deposit")
                    .build());
        }

        securityLogService.log(ActorType.admin, principal.getId(), "walkin_booking_create", "success",
                "Walk-in booking " + bookingCode + " for room " + room.getRoomNumber() + (checkInNow ? " (checked in)" : ""));

        return toBookingResponse(booking);
    }

    @Transactional
    public BookingResponse adminUpdateBooking(Integer bookingId, AdminUpdateBookingRequest request, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        enforceHotelScope(principal, booking.getRoom());

        if (booking.getStatus() != BookingStatus.booked) {
            throw new BusinessException("Chỉ có thể sửa các booking đang ở trạng thái Chờ nhận phòng.");
        }

        Room targetRoom = roomRepository.findByIdForUpdate(request.getRoomId())
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + request.getRoomId()));
        enforceHotelScope(principal, targetRoom);

        if (!Boolean.TRUE.equals(targetRoom.getIsActive()) || targetRoom.getStatus() == RoomStatus.maintenance) {
            throw new BusinessException("Phòng được chọn hiện đang bảo trì hoặc không khả dụng.");
        }

        PricingMode pricingMode = request.getPricingMode() != null ? request.getPricingMode() : PricingMode.night;
        LocalDate checkInDate = request.getCheckIn();
        LocalDate checkOutDate = request.getCheckOut();
        LocalDateTime startAt = request.getCheckInAt();
        LocalDateTime expectedOutAt = null;

        if (pricingMode == PricingMode.hour) {
            int hours = request.getDurationHours() != null && request.getDurationHours() > 0
                    ? request.getDurationHours() : 2;
            if (startAt == null) {
                startAt = checkInDate.equals(LocalDate.now())
                        ? LocalDateTime.now()
                        : checkInDate.atTime(14, 0);
            }
            expectedOutAt = startAt.plusHours(hours);
            checkInDate = startAt.toLocalDate();
            checkOutDate = expectedOutAt.toLocalDate();
            validateHourlyConflicts(targetRoom.getId(), booking.getId(), startAt, expectedOutAt);
        } else {
            validateDates(checkInDate, checkOutDate, pricingMode);
            long overlaps = bookingRepository.countOverlappingBookings(
                    targetRoom.getId(), booking.getId(), checkInDate, checkOutDate);
            if (overlaps > 0) {
                throw new ConflictException("Phòng được chọn đã có đơn đặt trùng vào khoảng ngày này.");
            }
            startAt = null;
            expectedOutAt = null;
        }

        booking.setRoom(targetRoom);
        booking.setPricingMode(pricingMode);
        booking.setCheckIn(checkInDate);
        booking.setCheckOut(checkOutDate);
        booking.setCheckInAt(startAt);
        booking.setExpectedCheckOutAt(expectedOutAt);
        booking.setAdults(request.getAdults());
        booking.setChildren(request.getChildren());
        booking.setContactName(request.getContactName().trim());
        booking.setContactPhone(request.getContactPhone().trim());
        booking.setNote(request.getNote());
        booking.setPackageSnapshot(targetRoom.getPackageName());

        Booking saved = bookingRepository.save(booking);
        securityLogService.log(ActorType.admin, principal.getId(), "booking_update", "success",
                "Updated booking " + saved.getBookingCode() + " (room " + targetRoom.getRoomNumber() + ")");
        return toBookingResponse(saved);
    }

    private void validateHourlyConflicts(Integer roomId, Integer excludeBookingId, LocalDateTime startAt, LocalDateTime expectedOutAt) {
        List<Booking> upcoming = bookingRepository.findActiveUpcomingBookings(roomId, startAt.toLocalDate());
        for (Booking existing : upcoming) {
            if (excludeBookingId != null && existing.getId().equals(excludeBookingId)) {
                continue;
            }
            if (existing.getPricingMode() == PricingMode.hour
                    && existing.getCheckInAt() != null
                    && existing.getExpectedCheckOutAt() != null) {
                if (startAt.isBefore(existing.getExpectedCheckOutAt()) && expectedOutAt.isAfter(existing.getCheckInAt())) {
                    throw new ConflictException("Phòng đã có lịch theo giờ " + existing.getBookingCode()
                            + " đến " + existing.getExpectedCheckOutAt().toLocalTime() + ".");
                }
            } else {
                LocalDateTime existingTurnoverStart = existing.getCheckIn().atTime(12, 0);
                LocalDateTime existingEnd = existing.getCheckOut().atTime(12, 0);
                if (startAt.isBefore(existingEnd) && expectedOutAt.isAfter(existingTurnoverStart)) {
                    throw new ConflictException("Phòng chỉ trống đến 12:00 ngày " + existing.getCheckIn()
                            + " (trước đơn " + existing.getBookingCode() + ").");
                }
            }
        }
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
    public Page<BookingResponse> adminListBookings(Integer hotelId, BookingStatus status, String keyword, UserPrincipal principal, Pageable pageable) {
        Integer scopedHotelId = principal.isAdminOrGlobalStaff() ? hotelId : principal.getHotelId();
        org.springframework.data.jpa.domain.Specification<Booking> spec = (root, query, cb) -> {
            List<jakarta.persistence.criteria.Predicate> predicates = new java.util.ArrayList<>();
            if (scopedHotelId != null) {
                predicates.add(cb.equal(root.get("room").get("hotel").get("id"), scopedHotelId));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (keyword != null && !keyword.isBlank()) {
                String pattern = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("bookingCode")), pattern),
                        cb.like(cb.lower(root.get("contactPhone")), pattern),
                        cb.like(cb.lower(root.get("contactName")), pattern)
                ));
            }
            query.orderBy(cb.desc(root.get("createdAt")));
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        return bookingRepository.findAll(spec, pageable).map(this::toBookingResponse);
    }

    @Transactional(readOnly = true)
    public BookingResponse lookupBooking(String bookingCode, String phone) {
        Booking booking = bookingRepository.findByBookingCode(bookingCode.trim().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingCode));
        String storedPhone = booking.getContactPhone() != null ? booking.getContactPhone() : booking.getGuest().getPhone();
        if (storedPhone == null || !storedPhone.trim().equals(phone.trim())) {
            throw new UnauthorizedException("Phone number does not match this booking.");
        }
        return toBookingResponse(booking);
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
    public InvoiceSummaryResponse removeServiceFromBooking(Integer bookingId, Integer itemId, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        enforceHotelScope(principal, booking.getRoom());

        if (booking.getStatus() == BookingStatus.checked_out || booking.getStatus() == BookingStatus.cancelled) {
            throw new BusinessException("Hóa đơn đã kết bill hoặc đã hủy, không thể xóa dịch vụ.");
        }

        BookingServiceItem item = bookingServiceItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Service item not found: " + itemId));
        if (!item.getBooking().getId().equals(bookingId)) {
            throw new BusinessException("Dịch vụ này không thuộc hóa đơn đang chọn.");
        }

        String svcName = item.getService() != null ? item.getService().getServiceName() : ("#" + itemId);
        bookingServiceItemRepository.delete(item);
        securityLogService.log(ActorType.admin, principal.getId(), "booking_service_remove", "success",
                "Removed service " + svcName + " from booking " + booking.getBookingCode());

        return buildInvoiceSummary(booking);
    }

    @Transactional
    public InvoiceSummaryResponse attachMemberToBooking(Integer bookingId, AttachMemberRequest request, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        enforceHotelScope(principal, booking.getRoom());

        if (booking.getStatus() == BookingStatus.checked_out || booking.getStatus() == BookingStatus.cancelled) {
            throw new BusinessException("Không thể thay đổi tài khoản thành viên sau khi đã kết bill.");
        }

        Guest member;
        if (request.getGuestId() != null) {
            member = guestRepository.findById(request.getGuestId())
                    .orElseThrow(() -> new ResourceNotFoundException("Member profile not found: " + request.getGuestId()));
        } else if (request.getIdentifier() != null && !request.getIdentifier().isBlank()) {
            member = guestRepository.findMatchingMembersByIdentifier(request.getIdentifier().trim())
                    .stream()
                    .findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản thành viên theo SĐT/CCCD đã nhập."));
        } else {
            throw new BusinessException("Vui lòng cung cấp SĐT/CCCD hoặc ID tài khoản thành viên.");
        }

        booking.setGuest(member);
        bookingRepository.save(booking);
        securityLogService.log(ActorType.admin, principal.getId(), "booking_member_attach", "success",
                "Attached member KH" + member.getId() + " (" + member.getFullName() + ") to " + booking.getBookingCode());

        return buildInvoiceSummary(booking);
    }

    @Transactional
    public PaymentResponse recordPayment(Integer bookingId, RecordPaymentRequest request, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        enforceHotelScope(principal, booking.getRoom());

        if (booking.getStatus() == BookingStatus.cancelled) {
            throw new BusinessException("Không thể ghi nhận thanh toán cho đơn đã hủy.");
        }

        String paymentNote = request.getNote();
        String payerName = request.getPayerName() != null && !request.getPayerName().isBlank()
                ? request.getPayerName().trim()
                : (booking.getContactName() != null ? booking.getContactName() : booking.getGuest().getFullName());

        if (isLoyaltyPointMethod(request.getMethod())) {
            Guest member = booking.getGuest();
            if (request.getMemberGuestId() != null) {
                member = guestRepository.findById(request.getMemberGuestId())
                        .orElseThrow(() -> new ResourceNotFoundException("Member profile not found: " + request.getMemberGuestId()));
                if (request.getVerifiedIdentifier() != null && !request.getVerifiedIdentifier().isBlank()) {
                    String cleanId = request.getVerifiedIdentifier().trim();
                    boolean matchesPhone = member.getPhone() != null && member.getPhone().trim().equalsIgnoreCase(cleanId);
                    boolean matchesCccd = member.getIdentityNo() != null && member.getIdentityNo().trim().equalsIgnoreCase(cleanId);
                    if (!matchesPhone && !matchesCccd) {
                        throw new UnauthorizedException("Xác thực SĐT/CCCD không khớp với tài khoản thành viên đã chọn.");
                    }
                }
            }
            int currentPoints = member.getLoyaltyPoints() != null ? member.getLoyaltyPoints() : 0;
            int pointsNeeded = request.getAmount()
                    .divide(BigDecimal.valueOf(1000), 0, RoundingMode.CEILING)
                    .intValue();
            if (currentPoints < pointsNeeded) {
                throw new BusinessException("Tài khoản " + member.getFullName() + " không đủ điểm thưởng (" + currentPoints + " điểm).");
            }
            member.setLoyaltyPoints(currentPoints - pointsNeeded);
            guestRepository.save(member);
            payerName = member.getFullName();
            String baseNote = (paymentNote != null && !paymentNote.isBlank()) ? paymentNote.trim() : ("Quy doi " + pointsNeeded + " diem");
            paymentNote = baseNote + " [#MID:" + member.getId() + "|#PTS:" + pointsNeeded + "]";
        }

        Payment payment = paymentRepository.save(Payment.builder()
                .booking(booking)
                .amount(request.getAmount())
                .method(request.getMethod())
                .payerName(payerName)
                .cashierName(principal.getUsername())
                .adminId(principal.getId())
                .note(paymentNote)
                .build());

        return toPaymentResponse(payment, booking);
    }

    @Transactional
    public InvoiceSummaryResponse removePaymentFromBooking(Integer bookingId, Integer paymentId, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        enforceHotelScope(principal, booking.getRoom());

        if (booking.getStatus() == BookingStatus.checked_out || booking.getStatus() == BookingStatus.cancelled) {
            throw new BusinessException("Hóa đơn đã kết bill hoặc đã hủy, không thể xóa khoản thanh toán.");
        }

        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + paymentId));
        if (!payment.getBooking().getId().equals(bookingId)) {
            throw new BusinessException("Khoản thanh toán không thuộc hóa đơn này.");
        }

        if (isBankTransferMethod(payment.getMethod(), payment.getId())) {
            throw new BusinessException("Không thể xóa giao dịch chuyển khoản do không hoàn tiền tự động được.");
        }

        if (isLoyaltyPointMethod(payment.getMethod())) {
            Integer memberId = extractIntTag(payment.getNote(), "#MID:(\\d+)");
            Guest member = memberId != null
                    ? guestRepository.findById(memberId).orElse(booking.getGuest())
                    : booking.getGuest();
            Integer ptsFromTag = extractIntTag(payment.getNote(), "#PTS:(\\d+)");
            int ptsToRefund = ptsFromTag != null
                    ? ptsFromTag
                    : payment.getAmount().divide(BigDecimal.valueOf(1000), 0, RoundingMode.CEILING).intValue();
            int current = member.getLoyaltyPoints() != null ? member.getLoyaltyPoints() : 0;
            member.setLoyaltyPoints(current + ptsToRefund);
            guestRepository.save(member);
        }

        String method = payment.getMethod();
        BigDecimal amount = payment.getAmount();
        paymentRepository.delete(payment);
        securityLogService.log(ActorType.admin, principal.getId(), "booking_payment_remove", "success",
                "Removed payment #" + paymentId + " (" + method + " " + amount + ") from booking " + booking.getBookingCode());

        return buildInvoiceSummary(booking);
    }

    @Transactional
    public InvoiceSummaryResponse checkOut(Integer bookingId, UserPrincipal principal) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + bookingId));
        enforceHotelScope(principal, booking.getRoom());

        if (booking.getStatus() != BookingStatus.checked_in) {
            throw new BusinessException("Booking must be in 'checked_in' status to check out.");
        }

        InvoiceSummaryResponse preInvoice = buildInvoiceSummary(booking);

        booking.setStatus(BookingStatus.checked_out);
        booking.setCheckedOutAt(LocalDateTime.now());

        int pointsEarned = 0;
        if (booking.getLoyaltyAwardedAt() == null && preInvoice.getGrandTotal().compareTo(BigDecimal.ZERO) > 0) {
            pointsEarned = preInvoice.getGrandTotal()
                    .divide(BigDecimal.valueOf(loyaltyVndPerPoint), 0, RoundingMode.FLOOR)
                    .intValue();
            if (pointsEarned > 0) {
                Guest guest = booking.getGuest();
                guest.setLoyaltyPoints(guest.getLoyaltyPoints() + pointsEarned);
                guestRepository.save(guest);
                booking.setLoyaltyAwardedAt(LocalDateTime.now());
            }
        }

        Room room = booking.getRoom();
        room.setStatus(RoomStatus.cleaning);
        room.setHousekeepingStatus(HousekeepingStatus.pending);
        roomRepository.save(room);
        Booking saved = bookingRepository.save(booking);

        InvoiceSummaryResponse finalInvoice = buildInvoiceSummary(saved);
        finalInvoice.setLoyaltyPointsEarned(pointsEarned);
        return finalInvoice;
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
        Hotel hotel = room.getHotel();
        Guest guest = booking.getGuest();
        BigDecimal baseRoomCharge = calculateBaseRoomCharge(booking, room);
        BigDecimal extraSurcharge = calculateExtraGuestSurcharge(booking, room, baseRoomCharge);

        List<BookingServiceItem> rawItems = bookingServiceItemRepository.findByBookingIdOrderByCreatedAtAsc(booking.getId());
        List<BookingServiceItemResponse> serviceItems = rawItems.stream()
                .map(item -> BookingServiceItemResponse.builder()
                        .id(item.getId())
                        .bookingId(booking.getId())
                        .serviceId(item.getService() != null ? item.getService().getId() : null)
                        .serviceName(item.getService() != null ? item.getService().getServiceName() : null)
                        .quantity(item.getQuantity())
                        .unitPrice(item.getPrice())
                        .lineTotal(item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                        .createdAt(item.getCreatedAt())
                        .build())
                .toList();

        BigDecimal serviceCharge = serviceItems.stream()
                .map(BookingServiceItemResponse::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<PaymentResponse> paymentItems = paymentRepository.findByBookingIdOrderByPaidAtAsc(booking.getId())
                .stream()
                .map(p -> toPaymentResponse(p, booking))
                .toList();

        BigDecimal subtotal = baseRoomCharge.add(extraSurcharge).add(serviceCharge);
        BigDecimal vatAmount = subtotal.multiply(vatRate).setScale(0, RoundingMode.HALF_UP);
        BigDecimal grandTotal = subtotal.add(vatAmount);
        BigDecimal totalPaid = paymentItems.stream()
                .map(PaymentResponse::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal remaining = grandTotal.subtract(totalPaid).max(BigDecimal.ZERO);

        BigDecimal guestSpent = guest != null ? paymentRepository.sumTotalSpentByGuestId(guest.getId()) : BigDecimal.ZERO;
        String memberTier = CustomerService.resolveMembershipTier(guestSpent != null ? guestSpent : BigDecimal.ZERO);
        String pkg = booking.getPackageSnapshot() != null && !booking.getPackageSnapshot().isBlank()
                ? booking.getPackageSnapshot()
                : room.getPackageName();

        return InvoiceSummaryResponse.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .bookingStatus(booking.getStatus())
                .hotelName(hotel != null ? hotel.getHotelName() : "Spotki Hotel")
                .hotelAddress(hotel != null ? hotel.getAddress() : null)
                .hotelPhone(hotel != null ? hotel.getPhone() : null)
                .roomNumber(room.getRoomNumber())
                .roomType(room.getRoomType())
                .packageName(pkg)
                .pricingMode(booking.getPricingMode())
                .adults(booking.getAdults())
                .children(booking.getChildren())
                .checkIn(booking.getCheckIn())
                .checkOut(booking.getCheckOut())
                .checkInAt(booking.getCheckInAt())
                .expectedCheckOutAt(booking.getExpectedCheckOutAt())
                .checkedOutAt(booking.getCheckedOutAt())
                .guestId(guest != null ? guest.getId() : null)
                .guestName(booking.getContactName() != null && !booking.getContactName().isBlank()
                        ? booking.getContactName()
                        : (guest != null ? guest.getFullName() : null))
                .guestPhone(guest != null && guest.getPhone() != null ? guest.getPhone() : booking.getContactPhone())
                .guestEmail(guest != null ? guest.getEmail() : null)
                .guestIdentityNo(guest != null ? guest.getIdentityNo() : null)
                .guestIsVip(guest != null ? guest.getIsVip() : false)
                .guestLoyaltyPoints(guest != null && guest.getLoyaltyPoints() != null ? guest.getLoyaltyPoints() : 0)
                .guestMembershipTier(memberTier)
                .roomCharge(baseRoomCharge)
                .extraGuestSurcharge(extraSurcharge)
                .serviceCharge(serviceCharge)
                .subtotal(subtotal)
                .vatAmount(vatAmount)
                .grandTotal(grandTotal)
                .totalPaid(totalPaid)
                .remainingBalance(remaining)
                .loyaltyPointsEarned(0)
                .services(serviceItems)
                .payments(paymentItems)
                .build();
    }

    private PaymentResponse toPaymentResponse(Payment p, Booking booking) {
        return PaymentResponse.builder()
                .id(p.getId())
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .amount(p.getAmount())
                .method(p.getMethod())
                .paidAt(p.getPaidAt())
                .payerName(p.getPayerName())
                .cashierName(p.getCashierName())
                .note(p.getNote())
                .bankTransfer(isBankTransferMethod(p.getMethod(), p.getId()))
                .build();
    }

    public boolean isBankTransferMethod(String method, Integer paymentId) {
        if (paymentId != null && paymentGatewayTransactionRepository != null
                && paymentGatewayTransactionRepository.existsByPaymentId(paymentId)) {
            return true;
        }
        String norm = normalizeMethod(method);
        return norm.contains("chuyen khoan")
                || norm.contains("vietqr")
                || norm.contains("online gateway")
                || norm.contains("zalopay")
                || norm.contains("bank");
    }

    private boolean isLoyaltyPointMethod(String method) {
        String norm = normalizeMethod(method);
        return norm.contains("diem thuong") || norm.contains("bang diem") || norm.contains("diem thanh vien");
    }

    private String normalizeMethod(String method) {
        if (method == null) return "";
        return Normalizer.normalize(method, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toLowerCase();
    }

    private Integer extractIntTag(String note, String regex) {
        if (note == null || note.isBlank()) return null;
        Matcher m = Pattern.compile(regex).matcher(note);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private BigDecimal calculateBaseRoomCharge(Booking booking, Room room) {
        if (booking.getPricingMode() == PricingMode.hour) {
            if (booking.getCheckInAt() != null && booking.getExpectedCheckOutAt() != null) {
                long minutes = Math.max(60, ChronoUnit.MINUTES.between(booking.getCheckInAt(), booking.getExpectedCheckOutAt()));
                long hours = Math.max(1, (minutes + 59) / 60);
                return room.getHourlyRate().multiply(BigDecimal.valueOf(hours));
            }
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
                .contactName(booking.getContactName())
                .contactPhone(booking.getContactPhone())
                .note(booking.getNote())
                .checkIn(booking.getCheckIn())
                .checkOut(booking.getCheckOut())
                .checkInAt(booking.getCheckInAt())
                .expectedCheckOutAt(booking.getExpectedCheckOutAt())
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
