package com.spotkihotel.security;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class RateLimitService {

    private static final String RATE_LIMIT_PREFIX = "ratelimit:auth:";

    private final StringRedisTemplate redisTemplate;
    private final boolean useRedis;
    private final int maxRequests;
    private final int windowSeconds;
    private final Map<String, WindowCounter> memoryCounters = new ConcurrentHashMap<>();

    public RateLimitService(
            ObjectProvider<StringRedisTemplate> redisTemplateProvider,
            @Value("${app.token-store.redis:true}") boolean useRedis,
            @Value("${app.rate-limit.auth.max-requests:20}") int maxRequests,
            @Value("${app.rate-limit.auth.window-seconds:60}") int windowSeconds
    ) {
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
        this.useRedis = useRedis && this.redisTemplate != null;
        this.maxRequests = maxRequests;
        this.windowSeconds = windowSeconds;
    }

    public RateLimitResult checkAndConsume(String clientKey) {
        String key = RATE_LIMIT_PREFIX + clientKey;
        long count;
        if (useRedis) {
            Long incremented = redisTemplate.opsForValue().increment(key);
            count = incremented != null ? incremented : 1L;
            if (count == 1L) {
                redisTemplate.expire(key, Duration.ofSeconds(windowSeconds));
            }
        } else {
            long now = System.currentTimeMillis();
            long windowMs = windowSeconds * 1000L;
            WindowCounter counter = memoryCounters.compute(key, (k, existing) -> {
                if (existing == null || now >= existing.resetAtMs) {
                    return new WindowCounter(now + windowMs);
                }
                return existing;
            });
            count = counter.count.incrementAndGet();
        }

        boolean allowed = count <= maxRequests;
        long remaining = Math.max(0L, maxRequests - count);
        return new RateLimitResult(allowed, maxRequests, remaining, windowSeconds);
    }

    public record RateLimitResult(boolean allowed, int limit, long remaining, int retryAfterSeconds) {}

    private static class WindowCounter {
        final long resetAtMs;
        final AtomicInteger count = new AtomicInteger(0);

        WindowCounter(long resetAtMs) {
            this.resetAtMs = resetAtMs;
        }
    }
}
