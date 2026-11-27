package com.spotkihotel.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;

@Entity
@Table(name = "hotels")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Hotel implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_hotel")
    private Integer id;

    @Column(name = "hotel_name", nullable = false, length = 180)
    private String hotelName;

    @Column(name = "brand_name", nullable = false, length = 120)
    @Builder.Default
    private String brandName = "Spotki Hotels";

    @Column(name = "star_rating", nullable = false)
    @Builder.Default
    private Integer starRating = 5;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(nullable = false, length = 120)
    private String city;

    @Column(length = 40)
    private String phone;

    @Column(length = 160)
    private String email;

    @Column(name = "hero_image", length = 500)
    private String heroImage;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
