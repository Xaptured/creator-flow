package com.creatorflow.media_service.model;

/**
 * Tracks the async Instagram media container lifecycle.
 *
 * <p>Instagram's own {@code status_code} values map as follows:
 * <ul>
 *   <li>{@code IN_PROGRESS} → {@link #PROCESSING}</li>
 *   <li>{@code FINISHED}    → {@link #FINISHED}</li>
 *   <li>{@code ERROR}       → {@link #ERROR}</li>
 *   <li>{@code EXPIRED}     → {@link #ERROR}</li>
 * </ul>
 */
public enum IgContainerStatus {
    /** Container created; first poll not yet received. */
    PENDING,

    /** Instagram reported IN_PROGRESS — still encoding. */
    PROCESSING,

    /** Instagram reported FINISHED — ready to publish. */
    FINISHED,

    /** Instagram reported ERROR or EXPIRED, or our timeout elapsed. */
    ERROR
}
