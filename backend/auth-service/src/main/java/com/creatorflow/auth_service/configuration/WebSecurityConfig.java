package com.creatorflow.auth_service.configuration;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class WebSecurityConfig {

    private static final String AUTHORITIES_CLAIM_NAME = "realm_access";
    private static final String AUTHORITY_KEY = "roles";
    private static final String AUTHORITY_PREFIX = "ROLE_";
    private static final String[] SWAGGER_UI_URLS = {
            "/swagger-ui.html",
            "/swagger-ui/**",
            "/v3/api-docs",
            "/v3/api-docs/**"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable);
        http.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        http.authorizeHttpRequests(auth -> auth.requestMatchers("/actuator/health").permitAll().requestMatchers(
                        SWAGGER_UI_URLS
                ).permitAll()
                                                                                .anyRequest().authenticated());
        http.oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));

        return http.build();
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter jwtConverter = new JwtAuthenticationConverter();
        jwtConverter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Map<String, Object> realmAccess = jwt.getClaimAsMap(AUTHORITIES_CLAIM_NAME);
            if (realmAccess == null || !realmAccess.containsKey(AUTHORITY_KEY)) {
                return List.of();
            }
            List<String> roles = (List<String>) realmAccess.get(AUTHORITY_KEY);
            return roles.stream()
                    .map(role -> new SimpleGrantedAuthority(AUTHORITY_PREFIX + role))
                    .collect(Collectors.toList());
        });
        return jwtConverter;
    }
}
