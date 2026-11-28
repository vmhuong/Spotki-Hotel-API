package com.spotkihotel.security;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenStoreService {

    private static final String BLACKLIST_PREFIX = "jwt:blacklist:";
    private static final String REFRESH_PREFIX = "jwt:refresh:";

    private final StringRedisTemplate redisTemplate;
    private final boolean useRedis;
    private final Map<String, Long> memoryStore = new ConcurrentHashMap<>();

    public TokenStoreService(
            ObjectProvider<StringRedisTemplate> redisTemplateProvider,
            @Value("${app.token-store.redis:true}") boolean useRedis
    ) {
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
        this.useRedis = useRedis && this.redisTemplate != null;
    }

    public void blacklistAccessToken(String jti, long ttlMs) {
        if (jti == null || ttlMs <= 0) {
            return;
        }
        String key = BLACKLIST_PREFIX + jti;
        if (useRedis) {
            redisTemplate.opsForValue().set(key, "revoked", Duration.ofMillis(ttlMs));
        } else {
            memoryStore.put(key, System.currentTimeMillis() + ttlMs);
        }
    }

    public boolean isAccessTokenBlacklisted(String jti) {
        if (jti == null) {
            return false;
        }
        String key = BLACKLIST_PREFIX + jti;
        if (useRedis) {
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        }
        return isPresentInMemory(key);
    }

    public void storeRefreshToken(String tokenId, String subject, long ttlMs) {
        if (tokenId == null || ttlMs <= 0) {
            return;
        }
        String key = REFRESH_PREFIX + tokenId;
        if (useRedis) {
            redisTemplate.opsForValue().set(key, subject, Duration.ofMillis(ttlMs));
        } else {
            memoryStore.put(key, System.currentTimeMillis() + ttlMs);
        }
    }

    public boolean isRefreshTokenActive(String tokenId) {
        if (tokenId == null) {
            return false;
        }
        String key = REFRESH_PREFIX + tokenId;
        if (useRedis) {
            return Boolean.TRUE.equals(redisTemplate.hasKey(key));
        }
        return isPresentInMemory(key);
    }

    public void revokeRefreshToken(String tokenId) {
        if (tokenId == null) {
            return;
        }
        String key = REFRESH_PREFIX + tokenId;
        if (useRedis) {
            redisTemplate.delete(key);
        } else {
            memoryStore.remove(key);
        }
    }

    private boolean isPresentInMemory(String key) {
        Long expiresAt = memoryStore.get(key);
        if (expiresAt == null) {
            return false;
        }
        if (expiresAt < System.currentTimeMillis()) {
            memoryStore.remove(key);
            return false;
        }
        return true;
    }
}
