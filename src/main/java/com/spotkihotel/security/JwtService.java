package com.spotkihotel.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMs;
    private final long refreshExpirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs,
            @Value("${app.jwt.refresh-expiration-ms:604800000}") long refreshExpirationMs
    ) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
        this.refreshExpirationMs = refreshExpirationMs;
    }

    public String generateToken(UserPrincipal principal) {
        return buildToken(principal, UUID.randomUUID().toString(), "access", expirationMs);
    }

    public String generateRefreshToken(UserPrincipal principal, String tokenId) {
        return buildToken(principal, tokenId, "refresh", refreshExpirationMs);
    }

    private String buildToken(UserPrincipal principal, String jti, String type, long ttlMs) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("uid", principal.getId());
        claims.put("userType", principal.getUserType());
        claims.put("role", principal.getRole());
        claims.put("type", type);
        if (principal.getHotelId() != null) {
            claims.put("hotelId", principal.getHotelId());
        }

        Date now = new Date();
        Date expiry = new Date(now.getTime() + ttlMs);

        return Jwts.builder()
                .id(jti)
                .claims(claims)
                .subject(principal.getUsername())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(signingKey)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = parseToken(token);
            return claims.getExpiration().after(new Date());
        } catch (Exception ex) {
            return false;
        }
    }

    public long getRemainingTtlMs(Claims claims) {
        return Math.max(0L, claims.getExpiration().getTime() - System.currentTimeMillis());
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    public long getRefreshExpirationMs() {
        return refreshExpirationMs;
    }
}
