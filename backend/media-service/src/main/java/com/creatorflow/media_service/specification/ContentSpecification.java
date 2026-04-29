package com.creatorflow.media_service.specification;

import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.ContentStatus;
import com.creatorflow.media_service.model.PlatformType;
import org.springframework.data.jpa.domain.Specification;

import java.util.UUID;

public final class ContentSpecification {

    private ContentSpecification() {
    }

    public static Specification<Content> hasOwner(UUID ownerId) {
        return (root, query, cb) -> cb.equal(root.get("ownerId"), ownerId);
    }

    public static Specification<Content> hasStatus(ContentStatus status) {
        return (root, query, cb) -> status == null ? cb.conjunction() : cb.equal(root.get("status"), status);
    }

    public static Specification<Content> hasPlatform(PlatformType platform) {
        return (root, query, cb) -> {
            if (platform == null) {
                return cb.conjunction();
            }
            return cb.isTrue(
                    cb.function(
                            "jsonb_contains",
                            Boolean.class,
                            root.get("platformTargets"),
                            cb.literal("[\"" + platform.name() + "\"]")));
        };
    }
}
