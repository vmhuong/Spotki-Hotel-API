package com.spotkihotel.service;

import com.spotkihotel.dto.auth.AuthDtos.*;
import com.spotkihotel.entity.AdminUser;
import com.spotkihotel.entity.Guest;
import com.spotkihotel.entity.enums.ActorType;
import com.spotkihotel.exception.ConflictException;
import com.spotkihotel.exception.UnauthorizedException;
import com.spotkihotel.repository.AdminUserRepository;
import com.spotkihotel.repository.GuestRepository;
import com.spotkihotel.security.JwtService;
import com.spotkihotel.security.TokenStoreService;
import com.spotkihotel.security.UserPrincipal;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final GuestRepository guestRepository;
    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TokenStoreService tokenStoreService;
    private final SecurityLogService securityLogService;

    @Transactional
    public AuthResponse registerCustomer(CustomerRegisterRequest request) {
        if (guestRepository.existsByEmailIgnoreCase(request.getEmail())) {
            throw new ConflictException("Email is already registered.");
        }

        Guest guest = guestRepository.save(Guest.builder()
                .fullName(request.getFullName().trim())
                .phone(request.getPhone().trim())
                .email(request.getEmail().trim().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .identityNo(request.getIdentityNo())
                .address(request.getAddress())
                .customerIsActive(true)
                .build());

        securityLogService.log(ActorType.customer, guest.getId(), "customer_register", "success",
                "Customer registered: " + guest.getEmail());

        return buildAuthResponse(UserPrincipal.builder()
                .id(guest.getId())
                .username(guest.getEmail())
                .userType("CUSTOMER")
                .role("ROLE_CUSTOMER")
                .active(true)
                .build(), guest.getFullName());
    }

    @Transactional
    public AuthResponse loginCustomer(CustomerLoginRequest request) {
        Guest guest = guestRepository.findByEmailIgnoreCase(request.getEmail().trim())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password."));

        if (!Boolean.TRUE.equals(guest.getCustomerIsActive())
                || guest.getPasswordHash() == null
                || !passwordEncoder.matches(request.getPassword(), guest.getPasswordHash())) {
            securityLogService.log(ActorType.guest, guest.getId(), "customer_login", "failed",
                    "Failed customer login for " + request.getEmail());
            throw new UnauthorizedException("Invalid email or password.");
        }

        securityLogService.log(ActorType.customer, guest.getId(), "customer_login", "success",
                "Customer logged in: " + guest.getEmail());

        return buildAuthResponse(UserPrincipal.builder()
                .id(guest.getId())
                .username(guest.getEmail())
                .userType("CUSTOMER")
                .role("ROLE_CUSTOMER")
                .active(true)
                .build(), guest.getFullName());
    }

    @Transactional
    public AuthResponse loginAdmin(AdminLoginRequest request) {
        AdminUser admin = adminUserRepository.findByUsername(request.getUsername().trim())
                .orElseThrow(() -> new UnauthorizedException("Invalid username or password."));

        if (!Boolean.TRUE.equals(admin.getIsActive())
                || !passwordEncoder.matches(request.getPassword(), admin.getPasswordHash())) {
            securityLogService.log(ActorType.admin, admin.getId(), "admin_login", "failed",
                    "Failed admin login for " + request.getUsername());
            throw new UnauthorizedException("Invalid username or password.");
        }

        String roleName = "ROLE_" + admin.getRole().name().toUpperCase();
        securityLogService.log(ActorType.admin, admin.getId(), "admin_login", "success",
                "Staff logged in: " + admin.getUsername() + " (" + roleName + ")");

        return buildAuthResponse(UserPrincipal.builder()
                .id(admin.getId())
                .username(admin.getUsername())
                .userType("ADMIN")
                .role(roleName)
                .hotelId(admin.getHotelId())
                .active(true)
                .build(), admin.getFullName());
    }

    @Transactional(readOnly = true)
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String token = request.getRefreshToken();
        if (!jwtService.isTokenValid(token)) {
            throw new UnauthorizedException("Invalid or expired refresh token.");
        }
        Claims claims = jwtService.parseToken(token);
        if (!"refresh".equals(claims.get("type", String.class))) {
            throw new UnauthorizedException("Provided token is not a refresh token.");
        }
        String tokenId = claims.getId();
        if (!tokenStoreService.isRefreshTokenActive(tokenId)) {
            throw new UnauthorizedException("Refresh token has been revoked.");
        }

        // Rotate refresh token
        tokenStoreService.revokeRefreshToken(tokenId);

        Integer uid = claims.get("uid", Integer.class);
        String userType = claims.get("userType", String.class);

        if ("CUSTOMER".equals(userType)) {
            Guest guest = guestRepository.findById(uid)
                    .filter(g -> Boolean.TRUE.equals(g.getCustomerIsActive()))
                    .orElseThrow(() -> new UnauthorizedException("Customer account is inactive."));
            return buildAuthResponse(UserPrincipal.builder()
                    .id(guest.getId())
                    .username(guest.getEmail())
                    .userType("CUSTOMER")
                    .role("ROLE_CUSTOMER")
                    .active(true)
                    .build(), guest.getFullName());
        } else {
            AdminUser admin = adminUserRepository.findById(uid)
                    .filter(a -> Boolean.TRUE.equals(a.getIsActive()))
                    .orElseThrow(() -> new UnauthorizedException("Staff account is inactive."));
            String roleName = "ROLE_" + admin.getRole().name().toUpperCase();
            return buildAuthResponse(UserPrincipal.builder()
                    .id(admin.getId())
                    .username(admin.getUsername())
                    .userType("ADMIN")
                    .role(roleName)
                    .hotelId(admin.getHotelId())
                    .active(true)
                    .build(), admin.getFullName());
        }
    }

    public void logout(String bearerHeader, RefreshTokenRequest refreshRequest) {
        if (bearerHeader != null && bearerHeader.startsWith("Bearer ")) {
            String accessToken = bearerHeader.substring(7);
            if (jwtService.isTokenValid(accessToken)) {
                Claims claims = jwtService.parseToken(accessToken);
                long remainingMs = jwtService.getRemainingTtlMs(claims);
                tokenStoreService.blacklistAccessToken(claims.getId(), remainingMs);
            }
        }
        if (refreshRequest != null && refreshRequest.getRefreshToken() != null
                && jwtService.isTokenValid(refreshRequest.getRefreshToken())) {
            Claims refreshClaims = jwtService.parseToken(refreshRequest.getRefreshToken());
            tokenStoreService.revokeRefreshToken(refreshClaims.getId());
        }
    }

    private AuthResponse buildAuthResponse(UserPrincipal principal, String fullName) {
        String accessToken = jwtService.generateToken(principal);
        String refreshId = UUID.randomUUID().toString();
        String refreshToken = jwtService.generateRefreshToken(principal, refreshId);
        tokenStoreService.storeRefreshToken(refreshId, principal.getUsername(), jwtService.getRefreshExpirationMs());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresInMs(jwtService.getExpirationMs())
                .userId(principal.getId())
                .username(principal.getUsername())
                .fullName(fullName)
                .role(principal.getRole())
                .hotelId(principal.getHotelId())
                .build();
    }
}
