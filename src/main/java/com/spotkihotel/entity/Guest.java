package com.spotkihotel.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "guests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Guest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_guest")
    private Integer id;

    @Column(name = "full_name", nullable = false, length = 255)
    private String fullName;

    @Column(nullable = false, length = 30)
    private String phone;

    @Column(length = 255)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "customer_is_active", nullable = false)
    @Builder.Default
    private Boolean customerIsActive = true;

    @Column(name = "identity_no", length = 60)
    private String identityNo;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(name = "is_vip", nullable = false)
    @Builder.Default
    private Boolean isVip = false;

    @Column(name = "loyalty_points", nullable = false)
    @Builder.Default
    private Integer loyaltyPoints = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
