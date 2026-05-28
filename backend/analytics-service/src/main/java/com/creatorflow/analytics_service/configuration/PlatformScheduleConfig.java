package com.creatorflow.analytics_service.configuration;

import com.creatorflow.analytics_service.model.PlatformType;

import java.util.Arrays;
import java.util.List;

/**
 * Per-platform metric-fetch window configuration.
 *
 * <h3>Why windows differ by platform</h3>
 * <ul>
 *   <li><b>Twitter / Instagram</b> — APIs surface engagement data in near
 *       real-time, so a T+1h snapshot is meaningful.  Growth typically
 *       concentrates in the first 24 hours, so T+24h is the most important
 *       window.  T+7d captures the long tail.</li>
 *
 *   <li><b>YouTube</b> — The YouTube Analytics API only serves <em>finalised</em>
 *       data.  Google documents a 48–72 hour processing lag before views, likes,
 *       and watch-time figures are accurate.  Pulling earlier always returns
 *       near-zero numbers that are not real zeros — they are simply incomplete
 *       data.  Additionally, YouTube videos have a much longer discovery curve
 *       driven by search and algorithmic recommendations, so a 30-day window
 *       (720 h) is far more informative than a 1-hour window.</li>
 * </ul>
 *
 * <h3>YouTube UX contract</h3>
 * When a creator composes a YouTube post in CreatorFlow, the UI explicitly asks:
 * "When did/will your video go live on YouTube?" and explains that we start
 * pulling analytics 72 hours after that time.  This timestamp is carried in
 * {@code ContentPublishedPayload.scheduledLiveAt} and is the T=0 anchor for
 * all window scheduling.  No polling or private→public detection is needed.
 */
public enum PlatformScheduleConfig {

    YOUTUBE(
            PlatformType.YOUTUBE,
            new WindowSpec[]{
                    new WindowSpec(72,  "3 days"),   // earliest reliable data from YouTube Analytics API
                    new WindowSpec(168, "7 days"),   // early growth curve
                    new WindowSpec(720, "30 days")   // algorithmic / search discovery tail
            }
    ),

    INSTAGRAM(
            PlatformType.INSTAGRAM,
            new WindowSpec[]{
                    new WindowSpec(1,   "1 hour"),
                    new WindowSpec(24,  "24 hours"),
                    new WindowSpec(168, "7 days")
            }
    ),

    TWITTER(
            PlatformType.TWITTER,
            new WindowSpec[]{
                    new WindowSpec(1,   "1 hour"),
                    new WindowSpec(24,  "24 hours"),
                    new WindowSpec(168, "7 days")
            }
    );

    private final PlatformType platform;
    private final WindowSpec[] windows;

    PlatformScheduleConfig(PlatformType platform, WindowSpec[] windows) {
        this.platform = platform;
        this.windows  = windows;
    }

    /** Returns the schedule config for the given platform. */
    public static PlatformScheduleConfig forPlatform(PlatformType platform) {
        for (PlatformScheduleConfig config : values()) {
            if (config.platform == platform) {
                return config;
            }
        }
        throw new IllegalArgumentException("No schedule config registered for platform: " + platform);
    }

    public List<WindowSpec> getWindows() {
        return Arrays.asList(windows);
    }

    // -------------------------------------------------------------------------

    /**
     * A single fetch window: how many hours after T=0 to fire, and a
     * human-readable label surfaced in API responses and the UI.
     */
    public record WindowSpec(int hours, String label) {}
}
