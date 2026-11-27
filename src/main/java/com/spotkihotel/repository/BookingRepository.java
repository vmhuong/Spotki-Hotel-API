package com.spotkihotel.repository;

import com.spotkihotel.entity.Booking;
import com.spotkihotel.entity.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Integer> {

    Optional<Booking> findByBookingCode(String bookingCode);

    @EntityGraph(attributePaths = {"room", "room.hotel", "guest"})
    List<Booking> findByGuestIdOrderByCreatedAtDesc(Integer guestId);

    @Query("""
        SELECT COUNT(b) FROM Booking b
        WHERE b.room.id = :roomId
          AND b.id <> :excludeBookingId
          AND b.status IN (com.spotkihotel.entity.enums.BookingStatus.booked, com.spotkihotel.entity.enums.BookingStatus.checked_in)
          AND b.checkIn < :checkOut
          AND b.checkOut > :checkIn
        """)
    long countOverlappingBookings(
            @Param("roomId") Integer roomId,
            @Param("excludeBookingId") Integer excludeBookingId,
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut
    );

    @EntityGraph(attributePaths = {"room", "room.hotel", "guest"})
    @Query("""
        SELECT b FROM Booking b
        WHERE (:hotelId IS NULL OR b.room.hotel.id = :hotelId)
          AND (:status IS NULL OR b.status = :status)
        """)
    Page<Booking> findByFilters(
            @Param("hotelId") Integer hotelId,
            @Param("status") BookingStatus status,
            Pageable pageable
    );

    long countByStatus(BookingStatus status);

    @Query("""
        SELECT b.room.id, b.room.roomNumber, b.room.roomType, b.room.hotel.hotelName, COUNT(b)
        FROM Booking b
        WHERE b.status <> com.spotkihotel.entity.enums.BookingStatus.cancelled
        GROUP BY b.room.id, b.room.roomNumber, b.room.roomType, b.room.hotel.hotelName
        ORDER BY COUNT(b) DESC
        """)
    List<Object[]> findTopBookedRooms(Pageable pageable);

    List<Booking> findByStatusAndCheckInBefore(BookingStatus status, LocalDate date);
}
