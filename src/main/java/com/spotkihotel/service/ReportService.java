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
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;

    @Transactional(readOnly = true)
    public ReportSummaryResponse getSummary() {
        var rooms = roomRepository.findAll();
        long available = rooms.stream().filter(r -> r.getStatus() == RoomStatus.available).count();
        long occupied = rooms.stream().filter(r -> r.getStatus() == RoomStatus.occupied).count();
        long cleaning = rooms.stream().filter(r -> r.getStatus() == RoomStatus.cleaning).count();

        return ReportSummaryResponse.builder()
                .totalRooms(rooms.size())
                .availableRooms(available)
                .occupiedRooms(occupied)
                .cleaningRooms(cleaning)
                .totalBookings(bookingRepository.count())
                .activeBookedCount(bookingRepository.countByStatus(BookingStatus.booked))
                .checkedInCount(bookingRepository.countByStatus(BookingStatus.checked_in))
                .checkedOutCount(bookingRepository.countByStatus(BookingStatus.checked_out))
                .totalRevenue(paymentRepository.sumTotalRevenue())
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
        return paymentRepository.findByFilters(scopedHotel, fromDt, toDt, pageable)
                .map(this::toPaymentRecord);
    }

    @Transactional(readOnly = true)
    public RevenueReportResponse getRevenueReport(Integer hotelId, LocalDate from, LocalDate to, UserPrincipal principal) {
        Integer scopedHotel = principal.isAdminOrGlobalStaff() ? hotelId : principal.getHotelId();
        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.atTime(LocalTime.MAX) : null;

        BigDecimal total = paymentRepository.sumRevenueByFilters(scopedHotel, fromDt, toDt);
        long count = paymentRepository.countByFilters(scopedHotel, fromDt, toDt);

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
        return bookingRepository.findTopBookedRooms(PageRequest.of(0, Math.max(1, limit)))
                .stream()
                .map(row -> TopRoomReportResponse.builder()
                        .roomId((Integer) row[0])
                        .roomNumber((String) row[1])
                        .roomType((String) row[2])
                        .hotelName((String) row[3])
                        .bookingCount((Long) row[4])
                        .build())
                .toList();
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
