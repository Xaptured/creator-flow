package com.creatorflow.auth_service.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class RateLimitConfig {

    @Value("${app.rate-limit.capacity:100}")
    private long capacity;

    @Value("${app.rate-limit.refill-tokens:100}")
    private long refillTokens;

    @Value("${app.rate-limit.refill-period-seconds:60}")
    private long refillPeriodSeconds;

    @Bean
    public RateLimitProperties rateLimitProperties() {
        return new RateLimitProperties(capacity, refillTokens, Duration.ofSeconds(refillPeriodSeconds));
    }

    public record RateLimitProperties(long capacity, long refillTokens, Duration refillPeriod) {}
}
