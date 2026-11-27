package com.spotkihotel.repository;

import com.spotkihotel.entity.Room;
import com.spotkihotel.entity.enums.RoomStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.id = :id")
    Optional<Room> findByIdForUpdate(@Param("id") Integer id);

    @EntityGraph(attributePaths = {"hotel"})
    @Query("""
        SELECT r FROM Room r
        WHERE r.isActive = true
          AND (:hotelId IS NULL OR r.hotel.id = :hotelId)
          AND (:minCapacity IS NULL OR r.capacity >= :minCapacity)
          AND (:maxPrice IS NULL OR r.pricePerNight <= :maxPrice)
          AND (:status IS NULL OR r.status = :status)
          AND (
            :checkIn IS NULL OR :checkOut IS NULL OR NOT EXISTS (
                SELECT b.id FROM Booking b
                WHERE b.room.id = r.id
                  AND b.status IN (com.spotkihotel.entity.enums.BookingStatus.booked, com.spotkihotel.entity.enums.BookingStatus.checked_in)
                  AND b.checkIn < :checkOut
                  AND b.checkOut > :checkIn
            )
          )
        """)
    Page<Room> searchAvailableRooms(
            @Param("hotelId") Integer hotelId,
            @Param("minCapacity") Integer minCapacity,
            @Param("maxPrice") BigDecimal maxPrice,
            @Param("status") RoomStatus status,
            @Param("checkIn") LocalDate checkIn,
            @Param("checkOut") LocalDate checkOut,
            Pageable pageable
    );

    List<Room> findByStatusInAndIsActiveTrueOrderByFloorNoAscRoomNumberAsc(List<RoomStatus> statuses);

    boolean existsByRoomNumber(String roomNumber);
}
