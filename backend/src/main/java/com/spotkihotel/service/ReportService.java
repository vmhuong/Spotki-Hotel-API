package com.spotkihotel.service;

import com.spotkihotel.dto.report.ReportDtos.*;
import com.spotkihotel.dto.report.ReportSummaryResponse;
import com.spotkihotel.entity.Payment;
import com.spotkihotel.entity.enums.BookingStatus;
import com.spotkihotel.entity.enums.RoomStatus;
import com.spotkihotel.repository.BookingRepository;
import com.spotkihotel.repository.PaymentRepository;
import com.spotkihotel.repository.RoomRepository;
import com.spotkihotel.security.UserPrincipal;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final LocalDateTime MIN_DATE = LocalDateTime.of(1970, 1, 1, 0, 0);
    private static final LocalDateTime MAX_DATE = LocalDateTime.of(2999, 12, 31, 23, 59, 59);

    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public ReportSummaryResponse getSummary() {
        return getSummary(null, null);
    }

    @Transactional(readOnly = true)
    public ReportSummaryResponse getSummary(Integer hotelId, UserPrincipal principal) {
        Integer scopedHotel = resolveScopedHotel(hotelId, principal);
        var rooms = scopedHotel != null ? roomRepository.findByHotelId(scopedHotel) : roomRepository.findAll();
        long available = rooms.stream().filter(r -> r.getStatus() == RoomStatus.available).count();
        long occupied = rooms.stream().filter(r -> r.getStatus() == RoomStatus.occupied).count();
        long cleaning = rooms.stream().filter(r -> r.getStatus() == RoomStatus.cleaning).count();

        long totalBookings = scopedHotel != null ? bookingRepository.countByRoomHotelId(scopedHotel) : bookingRepository.count();
        long activeBooked = scopedHotel != null
                ? bookingRepository.countByRoomHotelIdAndStatus(scopedHotel, BookingStatus.booked)
                : bookingRepository.countByStatus(BookingStatus.booked);
        long checkedIn = scopedHotel != null
                ? bookingRepository.countByRoomHotelIdAndStatus(scopedHotel, BookingStatus.checked_in)
                : bookingRepository.countByStatus(BookingStatus.checked_in);
        long checkedOut = scopedHotel != null
                ? bookingRepository.countByRoomHotelIdAndStatus(scopedHotel, BookingStatus.checked_out)
                : bookingRepository.countByStatus(BookingStatus.checked_out);
        BigDecimal totalRevenue = scopedHotel != null
                ? paymentRepository.sumTotalRevenueByHotel(scopedHotel)
                : paymentRepository.sumTotalRevenue();

        return ReportSummaryResponse.builder()
                .totalRooms(rooms.size())
                .availableRooms(available)
                .occupiedRooms(occupied)
                .cleaningRooms(cleaning)
                .totalBookings(totalBookings)
                .activeBookedCount(activeBooked)
                .checkedInCount(checkedIn)
                .checkedOutCount(checkedOut)
                .totalRevenue(totalRevenue != null ? totalRevenue : BigDecimal.ZERO)
                .build();
    }

    @Transactional(readOnly = true)
    public Page<PaymentRecordResponse> listPayments(
            Integer hotelId,
            LocalDate from,
            LocalDate to,
            UserPrincipal principal,
            Pageable pageable
    ) {
        Integer scopedHotel = principal.isAdminOrGlobalStaff() ? hotelId : principal.getHotelId();
        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.atTime(LocalTime.MAX) : null;

        Specification<Payment> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (scopedHotel != null) {
                predicates.add(cb.equal(root.get("booking").get("room").get("hotel").get("id"), scopedHotel));
            }
            if (fromDt != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("paidAt"), fromDt));
            }
            if (toDt != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("paidAt"), toDt));
            }
            query.orderBy(cb.desc(root.get("paidAt")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return paymentRepository.findAll(spec, pageable).map(this::toPaymentRecord);
    }

    @Transactional(readOnly = true)
    public RevenueReportResponse getRevenueReport(Integer hotelId, LocalDate from, LocalDate to, UserPrincipal principal) {
        Integer scopedHotel = principal.isAdminOrGlobalStaff() ? hotelId : principal.getHotelId();
        LocalDateTime fromDt = from != null ? from.atStartOfDay() : MIN_DATE;
        LocalDateTime toDt = to != null ? to.atTime(LocalTime.MAX) : MAX_DATE;

        BigDecimal total = scopedHotel == null
                ? paymentRepository.sumRevenueBetween(fromDt, toDt)
                : paymentRepository.sumRevenueByHotelBetween(scopedHotel, fromDt, toDt);
        long count = scopedHotel == null
                ? paymentRepository.countBetween(fromDt, toDt)
                : paymentRepository.countByHotelBetween(scopedHotel, fromDt, toDt);

        return RevenueReportResponse.builder()
                .from(from)
                .to(to)
                .hotelId(scopedHotel)
                .totalRevenue(total)
                .transactionCount(count)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TopRoomReportResponse> getTopRooms(int limit) {
        return getTopRooms(limit, null, null);
    }

    @Transactional(readOnly = true)
    public List<TopRoomReportResponse> getTopRooms(int limit, Integer hotelId, UserPrincipal principal) {
        Integer scopedHotel = resolveScopedHotel(hotelId, principal);
        PageRequest topPage = PageRequest.of(0, Math.max(1, limit));
        List<Object[]> rows = scopedHotel != null
                ? bookingRepository.findTopBookedRoomsByHotel(scopedHotel, topPage)
                : bookingRepository.findTopBookedRooms(topPage);
        return rows.stream()
                .map(row -> TopRoomReportResponse.builder()
                        .roomId((Integer) row[0])
                        .roomNumber((String) row[1])
                        .roomType((String) row[2])
                        .hotelName((String) row[3])
                        .bookingCount((Long) row[4])
                        .build())
                .toList();
    }

    private Integer resolveScopedHotel(Integer hotelId, UserPrincipal principal) {
        if (principal == null || principal.isAdminOrGlobalStaff()) {
            return hotelId;
        }
        return principal.getHotelId();
    }

    private PaymentRecordResponse toPaymentRecord(Payment p) {
        return PaymentRecordResponse.builder()
                .id(p.getId())
                .bookingId(p.getBooking().getId())
                .bookingCode(p.getBooking().getBookingCode())
                .hotelId(p.getBooking().getRoom().getHotel() != null ? p.getBooking().getRoom().getHotel().getId() : null)
                .amount(p.getAmount())
                .method(p.getMethod())
                .paidAt(p.getPaidAt())
                .payerName(p.getPayerName())
                .cashierName(p.getCashierName())
                .note(p.getNote())
                .build();
    }
}
