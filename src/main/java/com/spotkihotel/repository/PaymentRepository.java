package com.spotkihotel.repository;

import com.spotkihotel.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {
    List<Payment> findByBookingIdOrderByPaidAtAsc(Integer bookingId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.booking.id = :bookingId")
    BigDecimal sumPaidByBookingId(@Param("bookingId") Integer bookingId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p")
    BigDecimal sumTotalRevenue();

    @EntityGraph(attributePaths = {"booking", "booking.room", "booking.room.hotel"})
    @Query("""
        SELECT p FROM Payment p
        WHERE (:hotelId IS NULL OR p.booking.room.hotel.id = :hotelId)
          AND (:from IS NULL OR p.paidAt >= :from)
          AND (:to IS NULL OR p.paidAt <= :to)
        ORDER BY p.paidAt DESC
        """)
    Page<Payment> findByFilters(
            @Param("hotelId") Integer hotelId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to,
            Pageable pageable
    );

    @Query("""
        SELECT COALESCE(SUM(p.amount), 0) FROM Payment p
        WHERE (:hotelId IS NULL OR p.booking.room.hotel.id = :hotelId)
          AND (:from IS NULL OR p.paidAt >= :from)
          AND (:to IS NULL OR p.paidAt <= :to)
        """)
    BigDecimal sumRevenueByFilters(
            @Param("hotelId") Integer hotelId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

    @Query("""
        SELECT COUNT(p) FROM Payment p
        WHERE (:hotelId IS NULL OR p.booking.room.hotel.id = :hotelId)
          AND (:from IS NULL OR p.paidAt >= :from)
          AND (:to IS NULL OR p.paidAt <= :to)
        """)
    long countByFilters(
            @Param("hotelId") Integer hotelId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );
}
