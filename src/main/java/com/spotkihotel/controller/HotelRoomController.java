package com.spotkihotel.controller;

import com.spotkihotel.dto.ApiResponse;
import com.spotkihotel.dto.hotel.HotelDtos.UpsertHotelRequest;
import com.spotkihotel.dto.room.RoomDtos.*;
import com.spotkihotel.dto.service.ServiceDtos.UpsertServiceRequest;
import com.spotkihotel.entity.Hotel;
import com.spotkihotel.entity.HotelService;
import com.spotkihotel.entity.enums.RoomStatus;
import com.spotkihotel.security.UserPrincipal;
import com.spotkihotel.service.HotelAndRoomService;
import com.spotkihotel.service.ServiceCatalogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Hotels, Rooms, Services & Housekeeping", description = "Public catalog search and admin CRUD for hotels, rooms, services, and housekeeping")
public class HotelRoomController {

    private final HotelAndRoomService hotelAndRoomService;
    private final ServiceCatalogService serviceCatalogService;

    @GetMapping("/hotels")
    @Operation(summary = "List all active hotel branches")
    public ResponseEntity<ApiResponse<List<Hotel>>> getHotels() {
        return ResponseEntity.ok(ApiResponse.ok(hotelAndRoomService.getActiveHotels()));
    }

    @PostMapping("/admin/hotels")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new hotel branch (Admin)")
    public ResponseEntity<ApiResponse<Hotel>> createHotel(@Valid @RequestBody UpsertHotelRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Hotel created", hotelAndRoomService.createHotel(request)));
    }

    @PutMapping("/admin/hotels/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a hotel branch (Admin)")
    public ResponseEntity<ApiResponse<Hotel>> updateHotel(
            @PathVariable Integer id,
            @Valid @RequestBody UpsertHotelRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Hotel updated", hotelAndRoomService.updateHotel(id, request)));
    }

    @PatchMapping("/admin/hotels/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Activate or deactivate a hotel branch (Admin)")
    public ResponseEntity<ApiResponse<Hotel>> toggleHotelStatus(
            @PathVariable Integer id,
            @RequestParam boolean active
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Hotel status updated", hotelAndRoomService.toggleHotelStatus(id, active)));
    }

    @GetMapping("/rooms")
    @Operation(summary = "Search available rooms with optional filters and pagination")
    public ResponseEntity<ApiResponse<Page<RoomResponse>>> searchRooms(
            @RequestParam(required = false) Integer hotelId,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) RoomStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                hotelAndRoomService.searchRooms(hotelId, minCapacity, maxPrice, status, checkIn, checkOut, pageable)
        ));
    }

    @GetMapping("/rooms/{id}")
    @Operation(summary = "Get room details by ID")
    public ResponseEntity<ApiResponse<RoomResponse>> getRoomById(@PathVariable Integer id) {
        return ResponseEntity.ok(ApiResponse.ok(hotelAndRoomService.getRoomById(id)));
    }

    @PostMapping("/admin/rooms")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create a new room (Admin/Manager)")
    public ResponseEntity<ApiResponse<RoomResponse>> createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Room created", hotelAndRoomService.createRoom(request, principal)));
    }

    @PutMapping("/admin/rooms/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Update room details (Admin/Manager)")
    public ResponseEntity<ApiResponse<RoomResponse>> updateRoom(
            @PathVariable Integer id,
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Room updated", hotelAndRoomService.updateRoom(id, request, principal)));
    }

    @PatchMapping("/admin/rooms/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'RECEPTION')")
    @Operation(summary = "Update room status")
    public ResponseEntity<ApiResponse<RoomResponse>> updateRoomStatus(
            @PathVariable Integer id,
            @RequestParam RoomStatus status,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Room status updated", hotelAndRoomService.updateRoomStatus(id, status, principal)));
    }

    @DeleteMapping("/admin/rooms/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Soft-delete a room (Admin/Manager)")
    public ResponseEntity<ApiResponse<Void>> deleteRoom(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        hotelAndRoomService.softDeleteRoom(id, principal);
        return ResponseEntity.ok(ApiResponse.ok("Room deactivated", null));
    }

    @GetMapping("/services")
    @Operation(summary = "List active room services")
    public ResponseEntity<ApiResponse<List<HotelService>>> getServices() {
        return ResponseEntity.ok(ApiResponse.ok(serviceCatalogService.getActiveServices()));
    }

    @PostMapping("/admin/services")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Create a room service item")
    public ResponseEntity<ApiResponse<HotelService>> createService(@Valid @RequestBody UpsertServiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Service created", serviceCatalogService.createService(request)));
    }

    @PutMapping("/admin/services/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Update a room service item")
    public ResponseEntity<ApiResponse<HotelService>> updateService(
            @PathVariable Integer id,
            @Valid @RequestBody UpsertServiceRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Service updated", serviceCatalogService.updateService(id, request)));
    }

    @PatchMapping("/admin/services/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Operation(summary = "Activate or deactivate a room service item")
    public ResponseEntity<ApiResponse<HotelService>> toggleServiceStatus(
            @PathVariable Integer id,
            @RequestParam boolean active
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Service status updated", serviceCatalogService.toggleStatus(id, active)));
    }

    @GetMapping("/admin/housekeeping/rooms")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'HOUSEKEEPING', 'RECEPTION')")
    @Operation(summary = "Get rooms requiring housekeeping or maintenance")
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getHousekeepingQueue() {
        return ResponseEntity.ok(ApiResponse.ok(hotelAndRoomService.getHousekeepingQueue()));
    }

    @PatchMapping("/admin/housekeeping/rooms/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER', 'HOUSEKEEPING')")
    @Operation(summary = "Update room housekeeping status")
    public ResponseEntity<ApiResponse<RoomResponse>> updateHousekeeping(
            @PathVariable Integer id,
            @RequestBody UpdateHousekeepingRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok("Housekeeping updated", hotelAndRoomService.updateHousekeeping(id, request)));
    }
}
