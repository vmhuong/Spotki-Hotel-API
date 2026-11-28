package com.spotkihotel.repository;

import com.spotkihotel.entity.Booking;
import com.spotkihotel.entity.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Integer>, JpaSpecificationExecutor<Booking> {

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

    @Override
    @EntityGraph(attributePaths = {"room", "room.hotel", "guest"})
    Page<Booking> findAll(Specification<Booking> spec, Pageable pageable);

    long countByStatus(BookingStatus status);

    long countByRoomHotelId(Integer hotelId);

    long countByRoomHotelIdAndStatus(Integer hotelId, BookingStatus status);

    @Query("""
        SELECT b.room.id, b.room.roomNumber, b.room.roomType, b.room.hotel.hotelName, COUNT(b)
        FROM Booking b
        WHERE b.status <> com.spotkihotel.entity.enums.BookingStatus.cancelled
        GROUP BY b.room.id, b.room.roomNumber, b.room.roomType, b.room.hotel.hotelName
        ORDER BY COUNT(b) DESC
        """)
    List<Object[]> findTopBookedRooms(Pageable pageable);

    @Query("""
        SELECT b.room.id, b.room.roomNumber, b.room.roomType, b.room.hotel.hotelName, COUNT(b)
        FROM Booking b
        WHERE b.status <> com.spotkihotel.entity.enums.BookingStatus.cancelled
          AND b.room.hotel.id = :hotelId
        GROUP BY b.room.id, b.room.roomNumber, b.room.roomType, b.room.hotel.hotelName
        ORDER BY COUNT(b) DESC
        """)
    List<Object[]> findTopBookedRoomsByHotel(@Param("hotelId") Integer hotelId, Pageable pageable);

    List<Booking> findByStatusAndCheckInBefore(BookingStatus status, LocalDate date);

    @Query("""
        SELECT b.checkIn, b.checkOut FROM Booking b
        WHERE b.room.id = :roomId
          AND b.status IN (com.spotkihotel.entity.enums.BookingStatus.booked, com.spotkihotel.entity.enums.BookingStatus.checked_in)
          AND b.checkOut > :fromDate
        ORDER BY b.checkIn ASC
        """)
    List<Object[]> findActiveBookedRanges(@Param("roomId") Integer roomId, @Param("fromDate") LocalDate fromDate);

    @Query("""
        SELECT b FROM Booking b
        WHERE b.room.id = :roomId
          AND b.status IN (com.spotkihotel.entity.enums.BookingStatus.booked, com.spotkihotel.entity.enums.BookingStatus.checked_in)
          AND b.checkOut >= :fromDate
        ORDER BY b.checkIn ASC, b.checkInAt ASC
        """)
    List<Booking> findActiveUpcomingBookings(@Param("roomId") Integer roomId, @Param("fromDate") LocalDate fromDate);
}
