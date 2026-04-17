package com.creatorflow.media_service.configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenAPIConfig {

    @Value("${spring.application.name}")
    private String applicationName;

    @Bean
    public OpenAPI creatorFlowOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("CreatorFlow — " + applicationName)
                        .description("REST API documentation for the CreatorFlow platform.")
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("CreatorFlow Team")
                                .email("dev@creatorflow.io"))
                        .license(new License()
                                .name("Private")
                                .url("https://creatorflow.io")))
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Paste your Keycloak JWT — obtain via Postman or the login flow")))
                .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
    }
}
