package com.spotkihotel.controller;

import com.spotkihotel.dto.ApiResponse;
import com.spotkihotel.entity.SecurityLog;
import com.spotkihotel.entity.enums.ActorType;
import com.spotkihotel.repository.SecurityLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Security Audit Logs", description = "Admin inspection of authentication, booking, and rate-limit security events")
public class AuditLogController {

    private final SecurityLogRepository securityLogRepository;

    @GetMapping
    @Operation(summary = "List security audit logs with optional filters and pagination")
    public ResponseEntity<ApiResponse<Page<SecurityLog>>> listAuditLogs(
            @RequestParam(required = false) ActorType actorType,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Specification<SecurityLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (actorType != null) {
                predicates.add(cb.equal(root.get("actorType"), actorType));
            }
            if (action != null && !action.isBlank()) {
                predicates.add(cb.equal(root.get("action"), action.trim()));
            }
            if (status != null && !status.isBlank()) {
                predicates.add(cb.equal(root.get("status"), status.trim()));
            }
            query.orderBy(cb.desc(root.get("createdAt")), cb.desc(root.get("id")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return ResponseEntity.ok(ApiResponse.ok(securityLogRepository.findAll(spec, pageable)));
    }
}
