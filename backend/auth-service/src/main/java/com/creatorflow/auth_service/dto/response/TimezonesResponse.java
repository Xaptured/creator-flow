package com.creatorflow.auth_service.dto.response;

import java.util.List;

/**
 * Response shape for GET /v1.0/api/user/timezones.
 * Returns the ordered list of valid IANA timezone identifiers.
 */
public record TimezonesResponse(List<String> timezones) {}
