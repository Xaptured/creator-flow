package com.creatorflow.media_service.dto.response;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * Response for GET /api/platforms/{platform}/disconnect-check
 *
 * scheduledCount — number of SCHEDULED content rows that target this platform
 *                  for the requesting owner. A count > 0 means disconnecting will
 *                  orphan those posts and a confirmation dialog should be shown.
 */
@Getter
@RequiredArgsConstructor
public class DisconnectCheckResponse {

    private final long scheduledCount;
}
