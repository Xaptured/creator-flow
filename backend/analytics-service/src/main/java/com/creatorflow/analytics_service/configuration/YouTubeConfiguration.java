package com.creatorflow.analytics_service.configuration;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.net.http.HttpClient;
import java.time.Duration;

@Configuration
@EnableConfigurationProperties(YouTubeProperties.class)
public class YouTubeConfiguration {

    /**
     * Shared {@link HttpClient} for YouTube API calls.
     * Uses Java 21 built-in client — no extra dependency needed.
     */
    @Bean
    public HttpClient youtubeHttpClient() {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }
}
