package com.spotkihotel.repository;

import com.spotkihotel.entity.Room;
import com.spotkihotel.entity.enums.RoomStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Integer>, JpaSpecificationExecutor<Room> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM Room r WHERE r.id = :id")
    Optional<Room> findByIdForUpdate(@Param("id") Integer id);

    @Override
    @EntityGraph(attributePaths = {"hotel"})
    Page<Room> findAll(Specification<Room> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"hotel"})
    List<Room> findByIsActiveTrueAndStatusInOrderByFloorNoAscRoomNumberAsc(List<RoomStatus> statuses);

    @EntityGraph(attributePaths = {"hotel"})
    List<Room> findByIsActiveTrueAndHotelIdAndStatusInOrderByFloorNoAscRoomNumberAsc(Integer hotelId, List<RoomStatus> statuses);

    List<Room> findByHotelId(Integer hotelId);

    boolean existsByRoomNumber(String roomNumber);
}
