package com.creatorflow.auth_service.dto.response;

import java.util.List;

/**
 * Response shape for GET /v1.0/api/user/regions.
 * Returns the ordered list of valid trending regions for the Settings dropdown.
 */
public record RegionsResponse(List<RegionOption> regions) {

    /** code: ISO 3166-1 alpha-2 (stored on users.region); name: display label. */
    public record RegionOption(String code, String name) {}
}
