package com.creatorflow.auth_service.dto.response;

import java.util.List;

/**
 * Response shape for GET /v1.0/api/user/niches.
 * Returns the ordered list of valid content niche values.
 */
public record NichesResponse(List<String> niches) {}
