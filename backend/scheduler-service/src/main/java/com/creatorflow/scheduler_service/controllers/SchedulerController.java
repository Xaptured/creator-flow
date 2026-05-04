package com.creatorflow.scheduler_service.controllers;

import com.creatorflow.scheduler_service.dto.request.ScheduleContentRequest;
import com.creatorflow.scheduler_service.dto.response.ContentStatusResponse;
import com.creatorflow.scheduler_service.dto.response.ErrorResponse;
import com.creatorflow.scheduler_service.dto.response.ScheduleContentResponse;
import com.creatorflow.scheduler_service.services.SchedulerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1.0/api/scheduler")
@RequiredArgsConstructor
@Tag(name = "Scheduler", description = "Schedule content for publish to connected social platforms. " +
        "Supports both instant publish (scheduledAt = now) and future scheduled publish via the same endpoint.")
public class SchedulerController {

    private final SchedulerService schedulerService;

    @Operation(
            summary = "Schedule content for publish",
            description = "Creates one content row per platform target, each saved in its own independent transaction. " +
                    "Supplying [YOUTUBE, INSTAGRAM, TWITTER] creates three rows — a DB failure for one platform " +
                    "does not roll back the others. " +
                    "Each entry in the response array maps to one platform: successes carry contentId and status=SCHEDULED; " +
                    "failures carry status=FAILED_TO_SCHEDULE and an error message. " +
                    "HTTP 201 is returned if at least one platform succeeded; 500 if all failed. " +
                    "If scheduledAt is omitted or set to now, rows are picked up within the next Quartz poll cycle " +
                    "(instant publish). ownerId must be injected server-side by the BFF — never from the browser."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "At least one platform row created successfully. " +
                    "Check individual entries for per-platform status and any error messages."),
            @ApiResponse(responseCode = "400", description = "Missing required fields or invalid platformTargets",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "500", description = "All platform rows failed to save",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PostMapping("/schedule")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<List<ScheduleContentResponse>> schedule(@RequestBody ScheduleContentRequest request) {
        List<ScheduleContentResponse> responses = schedulerService.schedule(request);
        boolean anySucceeded = responses.stream().anyMatch(r -> r.getContentId() != null);
        HttpStatus status = anySucceeded ? HttpStatus.CREATED : HttpStatus.INTERNAL_SERVER_ERROR;
        return ResponseEntity.status(status).body(responses);
    }

    @Operation(
            summary = "Get content publish status",
            description = "Returns the current publish status for a piece of content. " +
                    "Status transitions: SCHEDULED → PUBLISHING → PUBLISHED / FAILED. " +
                    "ownerId is always injected server-side by the BFF — never from the browser."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Status returned successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Content not found or not owned by caller",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/content/{id}/status")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<ContentStatusResponse> getStatus(
            @Parameter(description = "Content UUID") @PathVariable("id") UUID contentId,
            @Parameter(description = "Owner UUID — injected server-side by BFF, never from browser")
            @RequestParam("ownerId") UUID ownerId) {
        return ResponseEntity.ok(schedulerService.getStatus(contentId, ownerId));
    }
}
