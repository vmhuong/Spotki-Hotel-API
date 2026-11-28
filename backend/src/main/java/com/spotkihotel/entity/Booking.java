package com.spotkihotel.entity;

import com.spotkihotel.entity.enums.BookingStatus;
import com.spotkihotel.entity.enums.PricingMode;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "bookings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_booking")
    private Integer id;

    @Column(name = "booking_code", nullable = false, unique = true, length = 30)
    private String bookingCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_guest", nullable = false)
    private Guest guest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_room", nullable = false)
    private Room room;

    @Column(name = "check_in", nullable = false)
    private LocalDate checkIn;

    @Column(name = "check_out", nullable = false)
    private LocalDate checkOut;

    @Column(name = "check_in_at")
    private LocalDateTime checkInAt;

    @Column(name = "expected_check_out_at")
    private LocalDateTime expectedCheckOutAt;

    @Column(name = "checked_out_at")
    private LocalDateTime checkedOutAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "pricing_mode", nullable = false, length = 20)
    @Builder.Default
    private PricingMode pricingMode = PricingMode.night;

    @Column(name = "contact_name", length = 160)
    private String contactName;

    @Column(name = "contact_phone", length = 40)
    private String contactPhone;

    @Column(name = "customer_edit_count", nullable = false)
    @Builder.Default
    private Integer customerEditCount = 0;

    @Column(name = "customer_edited_at")
    private LocalDateTime customerEditedAt;

    @Column(name = "loyalty_awarded_at")
    private LocalDateTime loyaltyAwardedAt;

    @Column(nullable = false)
    @Builder.Default
    private Integer adults = 1;

    @Column(nullable = false)
    @Builder.Default
    private Integer children = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private BookingStatus status = BookingStatus.booked;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "package_snapshot", columnDefinition = "TEXT")
    private String packageSnapshot;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
