package com.creatorflow.analytics_service.configuration;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
@EnableConfigurationProperties(TwitterProperties.class)
public class TwitterConfiguration {

    /**
     * Shared {@link HttpClient} for Twitter API v2 calls.
     * Uses Java 21 built-in client — no extra dependency needed.
     */
    @Bean("twitterHttpClient")
    public HttpClient twitterHttpClient() {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }
}
