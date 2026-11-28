package com.spotkihotel.repository;

import com.spotkihotel.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Integer>, JpaSpecificationExecutor<Payment> {
    List<Payment> findByBookingIdOrderByPaidAtAsc(Integer bookingId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.booking.id = :bookingId")
    BigDecimal sumPaidByBookingId(@Param("bookingId") Integer bookingId);

    @Query("""
        SELECT COALESCE(SUM(p.amount), 0) FROM Payment p
        WHERE p.booking.guest.id = :guestId
          AND p.booking.status <> com.spotkihotel.entity.enums.BookingStatus.cancelled
        """)
    BigDecimal sumTotalSpentByGuestId(@Param("guestId") Integer guestId);

    @Query("""
        SELECT p.booking.guest.id, COALESCE(SUM(p.amount), 0)
        FROM Payment p
        WHERE p.booking.guest.id IN :guestIds
          AND p.booking.status <> com.spotkihotel.entity.enums.BookingStatus.cancelled
        GROUP BY p.booking.guest.id
        """)
    List<Object[]> sumTotalSpentByGuestIds(@Param("guestIds") List<Integer> guestIds);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p")
    BigDecimal sumTotalRevenue();

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.booking.room.hotel.id = :hotelId")
    BigDecimal sumTotalRevenueByHotel(@Param("hotelId") Integer hotelId);

    @Override
    @EntityGraph(attributePaths = {"booking", "booking.room", "booking.room.hotel"})
    Page<Payment> findAll(Specification<Payment> spec, Pageable pageable);

    @Query("""
        SELECT COALESCE(SUM(p.amount), 0) FROM Payment p
        WHERE p.paidAt >= :from AND p.paidAt <= :to
        """)
    BigDecimal sumRevenueBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("""
        SELECT COALESCE(SUM(p.amount), 0) FROM Payment p
        WHERE p.booking.room.hotel.id = :hotelId AND p.paidAt >= :from AND p.paidAt <= :to
        """)
    BigDecimal sumRevenueByHotelBetween(@Param("hotelId") Integer hotelId, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("SELECT COUNT(p) FROM Payment p WHERE p.paidAt >= :from AND p.paidAt <= :to")
    long countBetween(@Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("""
        SELECT COUNT(p) FROM Payment p
        WHERE p.booking.room.hotel.id = :hotelId AND p.paidAt >= :from AND p.paidAt <= :to
        """)
    long countByHotelBetween(@Param("hotelId") Integer hotelId, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
