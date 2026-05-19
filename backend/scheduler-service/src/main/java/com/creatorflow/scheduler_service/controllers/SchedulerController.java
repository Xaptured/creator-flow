package com.creatorflow.scheduler_service.controllers;

import com.creatorflow.scheduler_service.dto.request.RescheduleContentRequest;
import com.creatorflow.scheduler_service.dto.request.ScheduleContentRequest;
import com.creatorflow.scheduler_service.dto.request.UpdateContentRequest;
import com.creatorflow.scheduler_service.dto.response.ContentStatusResponse;
import com.creatorflow.scheduler_service.dto.response.ErrorResponse;
import com.creatorflow.scheduler_service.dto.response.ScheduleContentResponse;
import com.creatorflow.scheduler_service.dto.response.ScheduledContentDetail;
import com.creatorflow.scheduler_service.dto.response.ScheduledContentSummary;
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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/v1.0/api/scheduler")
@RequiredArgsConstructor
@Tag(name = "Scheduler", description = "Schedule content for publish to connected social platforms.")
public class SchedulerController {

    private final SchedulerService schedulerService;

    @Operation(summary = "Schedule content for publish")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "At least one platform row created successfully."),
            @ApiResponse(responseCode = "400", description = "Missing required fields",
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

    @Operation(summary = "Get content publish status")
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
            @Parameter(description = "Owner UUID") @RequestParam("ownerId") UUID ownerId) {
        return ResponseEntity.ok(schedulerService.getStatus(contentId, ownerId));
    }

    @Operation(summary = "List all scheduled content for the owner")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List returned successfully"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/content")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<List<ScheduledContentSummary>> listContent(
            @Parameter(description = "Owner UUID") @RequestParam("ownerId") UUID ownerId) {
        return ResponseEntity.ok(schedulerService.listContent(ownerId));
    }

    @Operation(summary = "Get full details for a single content row",
            description = "Returns all fields needed to pre-fill the composer in edit mode.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Content details returned"),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Content not found or not owned by caller",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @GetMapping("/content/{id}")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<ScheduledContentDetail> getContent(
            @Parameter(description = "Content UUID") @PathVariable("id") UUID contentId,
            @Parameter(description = "Owner UUID") @RequestParam("ownerId") UUID ownerId) {
        return ResponseEntity.ok(schedulerService.getContent(contentId, ownerId));
    }

    @Operation(summary = "Update a scheduled content row",
            description = "Updates all mutable fields. Rejected with 409 if PUBLISHING or PUBLISHED.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Updated content details returned"),
            @ApiResponse(responseCode = "400", description = "Missing required fields",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Content not found or not owned by caller",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Content is already PUBLISHING or PUBLISHED",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PutMapping("/content/{id}")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<ScheduledContentDetail> updateContent(
            @Parameter(description = "Content UUID") @PathVariable("id") UUID contentId,
            @RequestBody UpdateContentRequest request) {
        if (request.getOwnerId() == null) {
            throw new IllegalArgumentException("ownerId is required");
        }
        return ResponseEntity.ok(schedulerService.updateContent(contentId, request.getOwnerId(), request));
    }

    @Operation(summary = "Reschedule a piece of content",
            description = "Updates scheduled_at for a SCHEDULED or FAILED content row.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Rescheduled successfully"),
            @ApiResponse(responseCode = "400", description = "Missing or invalid scheduledAt",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Missing CREATOR role",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "404", description = "Content not found or not owned by caller",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "Content is already PUBLISHING or PUBLISHED",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    @PatchMapping("/content/{id}/reschedule")
    @PreAuthorize("hasRole('CREATOR')")
    public ResponseEntity<Void> reschedule(
            @Parameter(description = "Content UUID") @PathVariable("id") UUID contentId,
            @RequestBody RescheduleContentRequest request) {
        if (request.getOwnerId() == null) {
            throw new IllegalArgumentException("ownerId is required");
        }
        if (request.getScheduledAt() == null) {
            throw new IllegalArgumentException("scheduledAt is required");
        }
        schedulerService.reschedule(contentId, request.getOwnerId(), request.getScheduledAt());
        return ResponseEntity.noContent().build();
    }
}
