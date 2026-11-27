package com.spotkihotel.service;

import com.spotkihotel.dto.hotel.HotelDtos.UpsertHotelRequest;
import com.spotkihotel.dto.room.RoomDtos.*;
import com.spotkihotel.entity.Hotel;
import com.spotkihotel.entity.Room;
import com.spotkihotel.entity.enums.HousekeepingStatus;
import com.spotkihotel.entity.enums.RoomStatus;
import com.spotkihotel.exception.BusinessException;
import com.spotkihotel.exception.ConflictException;
import com.spotkihotel.exception.ResourceNotFoundException;
import com.spotkihotel.exception.UnauthorizedException;
import com.spotkihotel.repository.HotelRepository;
import com.spotkihotel.repository.RoomRepository;
import com.spotkihotel.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HotelAndRoomService {

    private final HotelRepository hotelRepository;
    private final RoomRepository roomRepository;

    @Cacheable("hotels")
    @Transactional(readOnly = true)
    public List<Hotel> getActiveHotels() {
        return hotelRepository.findByIsActiveTrueOrderByStarRatingDescHotelNameAsc();
    }

    @CacheEvict(value = "hotels", allEntries = true)
    @Transactional
    public Hotel createHotel(UpsertHotelRequest request) {
        return hotelRepository.save(Hotel.builder()
                .hotelName(request.getHotelName().trim())
                .brandName(request.getBrandName() != null ? request.getBrandName().trim() : "Spotki Hotels")
                .starRating(request.getStarRating())
                .address(request.getAddress().trim())
                .city(request.getCity().trim())
                .phone(request.getPhone())
                .email(request.getEmail())
                .heroImage(request.getHeroImage())
                .description(request.getDescription())
                .isActive(true)
                .build());
    }

    @CacheEvict(value = "hotels", allEntries = true)
    @Transactional
    public Hotel updateHotel(Integer hotelId, UpsertHotelRequest request) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found: " + hotelId));
        hotel.setHotelName(request.getHotelName().trim());
        if (request.getBrandName() != null) hotel.setBrandName(request.getBrandName().trim());
        if (request.getStarRating() != null) hotel.setStarRating(request.getStarRating());
        hotel.setAddress(request.getAddress().trim());
        hotel.setCity(request.getCity().trim());
        hotel.setPhone(request.getPhone());
        hotel.setEmail(request.getEmail());
        hotel.setHeroImage(request.getHeroImage());
        hotel.setDescription(request.getDescription());
        return hotelRepository.save(hotel);
    }

    @CacheEvict(value = "hotels", allEntries = true)
    @Transactional
    public Hotel toggleHotelStatus(Integer hotelId, boolean active) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found: " + hotelId));
        hotel.setIsActive(active);
        return hotelRepository.save(hotel);
    }

    @Transactional(readOnly = true)
    public Page<RoomResponse> searchRooms(
            Integer hotelId,
            Integer minCapacity,
            BigDecimal maxPrice,
            RoomStatus status,
            LocalDate checkIn,
            LocalDate checkOut,
            Pageable pageable
    ) {
        if (checkIn != null && checkOut != null && !checkOut.isAfter(checkIn)) {
            throw new BusinessException("checkOut date must be after checkIn date.");
        }
        return roomRepository.searchAvailableRooms(hotelId, minCapacity, maxPrice, status, checkIn, checkOut, pageable)
                .map(this::toRoomResponse);
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoomById(Integer roomId) {
        Room room = roomRepository.findById(roomId)
                .filter(r -> Boolean.TRUE.equals(r.getIsActive()))
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + roomId));
        return toRoomResponse(room);
    }

    @Transactional
    public RoomResponse createRoom(CreateRoomRequest request, UserPrincipal principal) {
        if (!principal.isAdminOrGlobalStaff() && !principal.getHotelId().equals(request.getHotelId())) {
            throw new UnauthorizedException("You can only create rooms in your assigned hotel branch.");
        }
        if (roomRepository.existsByRoomNumber(request.getRoomNumber().trim())) {
            throw new ConflictException("Room number already exists: " + request.getRoomNumber());
        }
        Hotel hotel = hotelRepository.findById(request.getHotelId())
                .orElseThrow(() -> new ResourceNotFoundException("Hotel not found: " + request.getHotelId()));

        Room room = roomRepository.save(Room.builder()
                .hotel(hotel)
                .roomNumber(request.getRoomNumber().trim())
                .roomType(request.getRoomType().trim())
                .floorNo(request.getFloorNo())
                .capacity(request.getCapacity())
                .roomSize(request.getRoomSize())
                .bedType(request.getBedType())
                .pricePerNight(request.getPricePerNight())
                .hourlyRate(request.getHourlyRate())
                .extraGuestRatePercent(request.getExtraGuestRatePercent())
                .amenities(request.getAmenities())
                .packageName(request.getPackageName())
                .status(RoomStatus.available)
                .isActive(true)
                .build());
        return toRoomResponse(room);
    }

    @Transactional
    public RoomResponse updateRoom(Integer roomId, CreateRoomRequest request, UserPrincipal principal) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + roomId));
        enforceRoomScope(principal, room);

        room.setRoomType(request.getRoomType().trim());
        room.setFloorNo(request.getFloorNo());
        room.setCapacity(request.getCapacity());
        room.setRoomSize(request.getRoomSize());
        room.setBedType(request.getBedType());
        room.setPricePerNight(request.getPricePerNight());
        room.setHourlyRate(request.getHourlyRate());
        if (request.getExtraGuestRatePercent() != null) {
            room.setExtraGuestRatePercent(request.getExtraGuestRatePercent());
        }
        room.setAmenities(request.getAmenities());
        room.setPackageName(request.getPackageName());
        return toRoomResponse(roomRepository.save(room));
    }

    @Transactional
    public RoomResponse updateRoomStatus(Integer roomId, RoomStatus status, UserPrincipal principal) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + roomId));
        enforceRoomScope(principal, room);
        room.setStatus(status);
        return toRoomResponse(roomRepository.save(room));
    }

    @Transactional
    public void softDeleteRoom(Integer roomId, UserPrincipal principal) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + roomId));
        enforceRoomScope(principal, room);
        room.setIsActive(false);
        roomRepository.save(room);
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> getHousekeepingQueue(UserPrincipal principal) {
        Integer scopedHotelId = principal.isAdminOrGlobalStaff() ? null : principal.getHotelId();
        return roomRepository
                .findHousekeepingQueue(scopedHotelId, List.of(RoomStatus.cleaning, RoomStatus.maintenance))
                .stream()
                .map(this::toRoomResponse)
                .toList();
    }

    @Transactional
    public RoomResponse updateHousekeeping(Integer roomId, UpdateHousekeepingRequest request, UserPrincipal principal) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + roomId));
        enforceRoomScope(principal, room);

        if (request.getHousekeepingStatus() == HousekeepingStatus.cleaning) {
            room.setStatus(RoomStatus.cleaning);
            room.setHousekeepingStatus(HousekeepingStatus.cleaning);
            room.setHousekeepingStartedAt(LocalDateTime.now());
        } else if (request.getRoomStatus() == RoomStatus.available) {
            room.setStatus(RoomStatus.available);
            room.setHousekeepingStatus(null);
            room.setCleanedAt(LocalDateTime.now());
        } else if (request.getRoomStatus() != null) {
            room.setStatus(request.getRoomStatus());
            room.setHousekeepingStatus(request.getHousekeepingStatus());
        }

        if (request.getNote() != null) {
            room.setNote(request.getNote());
        }
        return toRoomResponse(roomRepository.save(room));
    }

    private void enforceRoomScope(UserPrincipal principal, Room room) {
        if (!principal.isAdminOrGlobalStaff() && room.getHotel() != null
                && !principal.getHotelId().equals(room.getHotel().getId())) {
            throw new UnauthorizedException("You do not have access to this hotel branch.");
        }
    }

    public RoomResponse toRoomResponse(Room room) {
        return RoomResponse.builder()
                .id(room.getId())
                .hotelId(room.getHotel() != null ? room.getHotel().getId() : null)
                .hotelName(room.getHotel() != null ? room.getHotel().getHotelName() : null)
                .roomNumber(room.getRoomNumber())
                .roomType(room.getRoomType())
                .floorNo(room.getFloorNo())
                .capacity(room.getCapacity())
                .roomSize(room.getRoomSize())
                .bedType(room.getBedType())
                .pricePerNight(room.getPricePerNight())
                .hourlyRate(room.getHourlyRate())
                .extraGuestRatePercent(room.getExtraGuestRatePercent())
                .amenities(room.getAmenities())
                .packageName(room.getPackageName())
                .status(room.getStatus())
                .housekeepingStatus(room.getHousekeepingStatus())
                .build();
    }
}
