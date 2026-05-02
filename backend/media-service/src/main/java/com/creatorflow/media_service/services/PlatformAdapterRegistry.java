package com.creatorflow.media_service.services;

import com.creatorflow.media_service.model.PlatformType;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Registry of all PlatformAdapter implementations.
 *
 * Spring auto-collects every PlatformAdapter bean via constructor injection.
 * Controller and services call getAdapter(PlatformType) — zero platform-specific code leaks up.
 *
 * Usage:
 *   PlatformAdapter adapter = registry.getAdapter(PlatformType.INSTAGRAM);
 *   adapter.buildAuthorizationUrl(ownerId);
 */
@Component
public class PlatformAdapterRegistry {

    private final Map<PlatformType, PlatformAdapter> adapters;

    public PlatformAdapterRegistry(List<PlatformAdapter> adapterList) {
        this.adapters = adapterList.stream()
                .collect(Collectors.toMap(PlatformAdapter::getPlatformType, Function.identity()));
    }

    public PlatformAdapter getAdapter(PlatformType platform) {
        PlatformAdapter adapter = adapters.get(platform);
        if (adapter == null) {
            throw new IllegalArgumentException("No adapter registered for platform: " + platform);
        }
        return adapter;
    }
}
