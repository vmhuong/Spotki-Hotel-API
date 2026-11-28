package com.spotkihotel.service;

import com.spotkihotel.dto.staff.StaffDtos.*;
import com.spotkihotel.entity.AdminUser;
import com.spotkihotel.entity.enums.StaffRole;
import com.spotkihotel.exception.BusinessException;
import com.spotkihotel.exception.ConflictException;
import com.spotkihotel.exception.ResourceNotFoundException;
import com.spotkihotel.exception.UnauthorizedException;
import com.spotkihotel.repository.AdminUserRepository;
import com.spotkihotel.security.UserPrincipal;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StaffService {

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public Page<StaffResponse> listStaff(Integer hotelId, StaffRole role, UserPrincipal principal, Pageable pageable) {
        Integer scopedHotel = principal.isAdminOrGlobalStaff() ? hotelId : principal.getHotelId();
        Specification<AdminUser> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (scopedHotel != null) {
                predicates.add(cb.equal(root.get("hotelId"), scopedHotel));
            }
            if (role != null) {
                predicates.add(cb.equal(root.get("role"), role));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return adminUserRepository.findAll(spec, pageable).map(this::toResponse);
    }

    @Transactional
    public StaffResponse createStaff(CreateStaffRequest request, UserPrincipal principal) {
        if (adminUserRepository.existsByUsername(request.getUsername().trim())) {
            throw new ConflictException("Username already exists: " + request.getUsername());
        }

        Integer targetHotelId = request.getHotelId();
        if (!principal.isAdminOrGlobalStaff()) {
            if (request.getRole() == StaffRole.admin) {
                throw new UnauthorizedException("Branch managers cannot create global admin accounts.");
            }
            targetHotelId = principal.getHotelId();
        }

        AdminUser user = adminUserRepository.save(AdminUser.builder()
                .username(request.getUsername().trim())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .email(request.getEmail())
                .role(request.getRole())
                .hotelId(targetHotelId)
                .isActive(true)
                .build());
        return toResponse(user);
    }

    @Transactional
    public StaffResponse updateStaff(Integer staffId, UpdateStaffRequest request, UserPrincipal principal) {
        AdminUser staff = adminUserRepository.findById(staffId)
                .orElseThrow(() -> new ResourceNotFoundException("Staff not found: " + staffId));

        if (!principal.isAdminOrGlobalStaff()
                && (staff.getHotelId() == null || !staff.getHotelId().equals(principal.getHotelId()))) {
            throw new UnauthorizedException("You can only manage staff in your own branch.");
        }
        if (staff.getId().equals(principal.getId()) && Boolean.FALSE.equals(request.getIsActive())) {
            throw new BusinessException("You cannot deactivate your own account.");
        }

        if (request.getFullName() != null) staff.setFullName(request.getFullName().trim());
        if (request.getEmail() != null) staff.setEmail(request.getEmail());
        if (request.getRole() != null) {
            if (!principal.isAdminOrGlobalStaff() && request.getRole() == StaffRole.admin) {
                throw new UnauthorizedException("Only global admin can assign admin role.");
            }
            staff.setRole(request.getRole());
        }
        if (request.getHotelId() != null && principal.isAdminOrGlobalStaff()) {
            staff.setHotelId(request.getHotelId());
        }
        if (request.getIsActive() != null) staff.setIsActive(request.getIsActive());

        return toResponse(adminUserRepository.save(staff));
    }

    private StaffResponse toResponse(AdminUser user) {
        return StaffResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .role(user.getRole())
                .hotelId(user.getHotelId())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
