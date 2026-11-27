package com.spotkihotel.entity;

import com.spotkihotel.entity.enums.HousekeepingStatus;
import com.spotkihotel.entity.enums.RoomStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rooms")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_room")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_hotel")
    private Hotel hotel;

    @Column(name = "room_number", nullable = false, unique = true, length = 30)
    private String roomNumber;

    @Column(name = "room_type", nullable = false, length = 80)
    private String roomType;

    @Column(name = "floor_no", nullable = false)
    @Builder.Default
    private Integer floorNo = 1;

    @Column(nullable = false)
    @Builder.Default
    private Integer capacity = 2;

    @Column(name = "room_size", length = 40)
    private String roomSize;

    @Column(name = "bed_type", length = 120)
    private String bedType;

    @Column(name = "price_per_night", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal pricePerNight = BigDecimal.ZERO;

    @Column(name = "hourly_rate", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal hourlyRate = BigDecimal.ZERO;

    @Column(name = "extra_guest_rate_percent", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal extraGuestRatePercent = new BigDecimal("25.00");

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "gallery_urls", columnDefinition = "TEXT")
    private String galleryUrls;

    @Column(columnDefinition = "TEXT")
    private String amenities;

    @Column(name = "package_name", length = 160)
    private String packageName;

    @Column(name = "package_services", columnDefinition = "TEXT")
    private String packageServices;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private RoomStatus status = RoomStatus.available;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "housekeeping_status", length = 30)
    private HousekeepingStatus housekeepingStatus;

    @Column(name = "housekeeping_started_at")
    private LocalDateTime housekeepingStartedAt;

    @Column(name = "cleaned_at")
    private LocalDateTime cleanedAt;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
