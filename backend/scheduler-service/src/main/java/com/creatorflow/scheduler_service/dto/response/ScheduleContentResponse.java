package com.creatorflow.scheduler_service.dto.response;

import com.creatorflow.scheduler_service.model.PlatformType;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
public class ScheduleContentResponse {

    private UUID contentId;
    private PlatformType platform;
    private String status;
    private Instant scheduledAt;
    private String error;

    public static ScheduleContentResponse success(UUID contentId, PlatformType platform,
                                                   String status, Instant scheduledAt) {
        ScheduleContentResponse r = new ScheduleContentResponse();
        r.contentId = contentId;
        r.platform = platform;
        r.status = status;
        r.scheduledAt = scheduledAt;
        return r;
    }

    public static ScheduleContentResponse failure(PlatformType platform, String error) {
        ScheduleContentResponse r = new ScheduleContentResponse();
        r.platform = platform;
        r.status = "FAILED_TO_SCHEDULE";
        r.error = error;
        return r;
    }
}
