package com.spotkihotel.entity;

import com.spotkihotel.entity.enums.ActorType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "security_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SecurityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_log")
    private Integer id;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 20)
    @Builder.Default
    private ActorType actorType = ActorType.guest;

    @Column(name = "actor_id")
    private Integer actorId;

    @Column(nullable = false, length = 120)
    private String action;

    @Column(nullable = false, length = 40)
    @Builder.Default
    private String status = "info";

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "context_json", columnDefinition = "TEXT")
    private String contextJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
