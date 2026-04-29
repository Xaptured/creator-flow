package com.creatorflow.media_service.services;

import com.creatorflow.media_service.dto.response.ContentResponse;
import com.creatorflow.media_service.model.ContentStatus;
import com.creatorflow.media_service.model.PlatformType;
import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.repository.ContentRepository;
import com.creatorflow.media_service.specification.ContentSpecification;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ContentService {

    private final ContentRepository contentRepository;

    public ContentService(ContentRepository contentRepository) {
        this.contentRepository = contentRepository;
    }

    @Transactional(readOnly = true)
    public List<ContentResponse> listContent(UUID ownerId, ContentStatus status, PlatformType platform) {
        Specification<Content> spec = ContentSpecification.hasOwner(ownerId)
                .and(ContentSpecification.hasStatus(status))
                .and(ContentSpecification.hasPlatform(platform));

        return contentRepository.findAll(spec)
                .stream()
                .map(ContentResponse::from)
                .toList();
    }
}
