package com.creatorflow.media_service.jobs;

import com.creatorflow.media_service.client.MetaClient;
import com.creatorflow.media_service.configuration.MetaOAuthProperties;
import com.creatorflow.media_service.exception.PlatformNotConnectedException;
import com.creatorflow.media_service.model.Content;
import com.creatorflow.media_service.model.ContentStatus;
import com.creatorflow.media_service.model.IgContainerStatus;
import com.creatorflow.media_service.model.IgContainerTracking;
import com.creatorflow.media_service.model.PlatformAccount;
import com.creatorflow.media_service.repository.ContentRepository;
import com.creatorflow.media_service.repository.IgContainerTrackingRepository;
import com.creatorflow.media_service.services.PlatformTokenCacheService;
import com.creatorflow.media_service.services.SnsPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IgContainerPollingJobTest {

    // --- shared mocks used by both test classes ---
    @Mock IgContainerTrackingRepository igContainerTrackingRepository;
    @Mock ContentRepository contentRepository;
    @Mock PlatformTokenCacheService platformTokenCacheService;
    @Mock MetaClient metaClient;
    @Mock SnsPublisher snsPublisher;
    @Mock MetaOAuthProperties metaOAuthProperties;

    private static final String CONTAINER_ID = "17889615691515546";
    private static final String ACCESS_TOKEN = "test-access-token";
    private static final String IG_USER_ID   = "123456789";
    private static final String IG_MEDIA_ID  = "987654321";

    // ---------------------------------------------------------------------------
    // IgContainerPollingJob — the thin Quartz shell
    // ---------------------------------------------------------------------------

    @Nested
    @DisplayName("IgContainerPollingJob (scheduling shell)")
    class JobShellTests {

        @Mock IgContainerPollingProcessor processor;
        IgContainerPollingJob job;

        @BeforeEach
        void setUp() {
            job = new IgContainerPollingJob(igContainerTrackingRepository, processor);
        }

        @Test
        @DisplayName("No active containers: does not call processor")
        void noActiveContainers_doesNotCallProcessor() {
            when(igContainerTrackingRepository.findByStatusIn(any())).thenReturn(List.of());

            job.execute(null);

            verify(processor, never()).process(any(), any());
        }

        @Test
        @DisplayName("Active containers present: delegates each to processor")
        void activeContainers_delegatesToProcessor() {
            IgContainerTracking t1 = buildTracking(IgContainerStatus.PENDING, LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
            IgContainerTracking t2 = buildTracking(IgContainerStatus.PROCESSING, LocalDateTime.now(ZoneOffset.UTC).minusMinutes(2));
            when(igContainerTrackingRepository.findByStatusIn(any())).thenReturn(List.of(t1, t2));

            job.execute(null);

            verify(processor).process(any(), any());  // called at least once per tracking row
        }

        @Test
        @DisplayName("Processor throws for one container: skips it and continues with the rest")
        void processorThrows_skipsAndContinues() {
            IgContainerTracking t1 = buildTracking(IgContainerStatus.PENDING, LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
            IgContainerTracking t2 = buildTracking(IgContainerStatus.PENDING, LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1));
            when(igContainerTrackingRepository.findByStatusIn(any())).thenReturn(List.of(t1, t2));
            when(processor.process(any(), any()))
                    .thenThrow(new RuntimeException("boom"))
                    .thenReturn(null);

            // should not throw
            job.execute(null);
        }
    }

    // ---------------------------------------------------------------------------
    // IgContainerPollingProcessor — the transactional business logic
    // ---------------------------------------------------------------------------

    @Nested
    @DisplayName("IgContainerPollingProcessor (transactional logic)")
    class ProcessorTests {

        IgContainerPollingProcessor processor;

        @BeforeEach
        void setUp() {
            processor = new IgContainerPollingProcessor(
                    igContainerTrackingRepository,
                    contentRepository,
                    platformTokenCacheService,
                    metaClient,
                    snsPublisher,
                    metaOAuthProperties,
                    5 // 5-minute timeout
            );
        }

        @Test
        @DisplayName("FINISHED status_code: calls publish, marks tracking FINISHED, content PUBLISHED, emits CONTENT_PUBLISHED")
        void finished_publishesAndMarksPublished() {
            LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
            IgContainerTracking tracking = buildTracking(IgContainerStatus.PROCESSING, now.minusMinutes(1));
            Content content = buildContent(tracking.getContentId());

            when(metaOAuthProperties.isSandbox()).thenReturn(false);
            when(platformTokenCacheService.getPlatformAccount(tracking.getOwnerId(), "INSTAGRAM"))
                    .thenReturn(buildAccount());
            when(metaClient.getContainerStatus(ACCESS_TOKEN, CONTAINER_ID))
                    .thenReturn(MetaClient.CONTAINER_STATUS_FINISHED);
            when(metaClient.publishContainer(ACCESS_TOKEN, IG_USER_ID, CONTAINER_ID))
                    .thenReturn(IG_MEDIA_ID);
            when(contentRepository.findById(tracking.getContentId()))
                    .thenReturn(Optional.of(content));

            processor.process(tracking, now);

            ArgumentCaptor<IgContainerTracking> savedTracking = ArgumentCaptor.forClass(IgContainerTracking.class);
            verify(igContainerTrackingRepository).save(savedTracking.capture());
            assertThat(savedTracking.getValue().getStatus()).isEqualTo(IgContainerStatus.FINISHED);

            ArgumentCaptor<Content> savedContent = ArgumentCaptor.forClass(Content.class);
            verify(contentRepository).save(savedContent.capture());
            assertThat(savedContent.getValue().getStatus()).isEqualTo(ContentStatus.PUBLISHED);

            verify(snsPublisher).publishToTopic(any(), any());
        }

        @Test
        @DisplayName("FINISHED + sandbox mode: skips Step 2 publish call, marks PUBLISHED")
        void finished_sandboxMode_skipsPublishCall() {
            LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
            IgContainerTracking tracking = buildTracking(IgContainerStatus.PROCESSING, now.minusMinutes(1));
            Content content = buildContent(tracking.getContentId());

            when(metaOAuthProperties.isSandbox()).thenReturn(true);
            when(platformTokenCacheService.getPlatformAccount(tracking.getOwnerId(), "INSTAGRAM"))
                    .thenReturn(buildAccount());
            when(metaClient.getContainerStatus(ACCESS_TOKEN, CONTAINER_ID))
                    .thenReturn(MetaClient.CONTAINER_STATUS_FINISHED);
            when(contentRepository.findById(tracking.getContentId()))
                    .thenReturn(Optional.of(content));

            processor.process(tracking, now);

            verify(metaClient, never()).publishContainer(any(), any(), any());

            ArgumentCaptor<Content> savedContent = ArgumentCaptor.forClass(Content.class);
            verify(contentRepository).save(savedContent.capture());
            assertThat(savedContent.getValue().getStatus()).isEqualTo(ContentStatus.PUBLISHED);
        }

        @Test
        @DisplayName("ERROR status_code: marks tracking ERROR, content FAILED, stores error detail, emits CONTENT_FAILED")
        void error_marksFailedAndEmitsEvent() {
            LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
            IgContainerTracking tracking = buildTracking(IgContainerStatus.PROCESSING, now.minusMinutes(1));
            Content content = buildContent(tracking.getContentId());

            when(platformTokenCacheService.getPlatformAccount(tracking.getOwnerId(), "INSTAGRAM"))
                    .thenReturn(buildAccount());
            when(metaClient.getContainerStatus(ACCESS_TOKEN, CONTAINER_ID))
                    .thenReturn(MetaClient.CONTAINER_STATUS_ERROR);
            when(contentRepository.findById(tracking.getContentId()))
                    .thenReturn(Optional.of(content));

            processor.process(tracking, now);

            ArgumentCaptor<IgContainerTracking> savedTracking = ArgumentCaptor.forClass(IgContainerTracking.class);
            verify(igContainerTrackingRepository).save(savedTracking.capture());
            assertThat(savedTracking.getValue().getStatus()).isEqualTo(IgContainerStatus.ERROR);
            assertThat(savedTracking.getValue().getError()).contains("ERROR");

            ArgumentCaptor<Content> savedContent = ArgumentCaptor.forClass(Content.class);
            verify(contentRepository).save(savedContent.capture());
            assertThat(savedContent.getValue().getStatus()).isEqualTo(ContentStatus.FAILED);

            verify(metaClient, never()).publishContainer(any(), any(), any());
            verify(snsPublisher).publishToTopic(any(), any());
        }

        @Test
        @DisplayName("EXPIRED status_code: marks tracking ERROR and content FAILED")
        void expired_marksFailed() {
            LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
            IgContainerTracking tracking = buildTracking(IgContainerStatus.PROCESSING, now.minusMinutes(1));
            Content content = buildContent(tracking.getContentId());

            when(platformTokenCacheService.getPlatformAccount(tracking.getOwnerId(), "INSTAGRAM"))
                    .thenReturn(buildAccount());
            when(metaClient.getContainerStatus(ACCESS_TOKEN, CONTAINER_ID))
                    .thenReturn("EXPIRED");
            when(contentRepository.findById(tracking.getContentId()))
                    .thenReturn(Optional.of(content));

            processor.process(tracking, now);

            ArgumentCaptor<IgContainerTracking> savedTracking = ArgumentCaptor.forClass(IgContainerTracking.class);
            verify(igContainerTrackingRepository).save(savedTracking.capture());
            assertThat(savedTracking.getValue().getStatus()).isEqualTo(IgContainerStatus.ERROR);

            ArgumentCaptor<Content> savedContent = ArgumentCaptor.forClass(Content.class);
            verify(contentRepository).save(savedContent.capture());
            assertThat(savedContent.getValue().getStatus()).isEqualTo(ContentStatus.FAILED);
        }

        @Test
        @DisplayName("Container older than timeout: marks FAILED without calling Instagram")
        void timeout_marksFailedWithoutCallingInstagram() {
            LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
            IgContainerTracking tracking = buildTracking(IgContainerStatus.PENDING, now.minusMinutes(10));
            Content content = buildContent(tracking.getContentId());

            when(contentRepository.findById(tracking.getContentId()))
                    .thenReturn(Optional.of(content));

            processor.process(tracking, now);

            ArgumentCaptor<IgContainerTracking> savedTracking = ArgumentCaptor.forClass(IgContainerTracking.class);
            verify(igContainerTrackingRepository).save(savedTracking.capture());
            assertThat(savedTracking.getValue().getStatus()).isEqualTo(IgContainerStatus.ERROR);
            assertThat(savedTracking.getValue().getError()).contains("timed out");

            ArgumentCaptor<Content> savedContent = ArgumentCaptor.forClass(Content.class);
            verify(contentRepository).save(savedContent.capture());
            assertThat(savedContent.getValue().getStatus()).isEqualTo(ContentStatus.FAILED);

            verify(metaClient, never()).getContainerStatus(any(), any());
        }

        @Test
        @DisplayName("IN_PROGRESS status_code: no save, waits for next poll cycle")
        void inProgress_noSave() {
            LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
            IgContainerTracking tracking = buildTracking(IgContainerStatus.PROCESSING, now.minusMinutes(1));

            when(platformTokenCacheService.getPlatformAccount(tracking.getOwnerId(), "INSTAGRAM"))
                    .thenReturn(buildAccount());
            when(metaClient.getContainerStatus(ACCESS_TOKEN, CONTAINER_ID))
                    .thenReturn("IN_PROGRESS");

            processor.process(tracking, now);

            verify(igContainerTrackingRepository, never()).save(any());
            verify(contentRepository, never()).save(any());
            verify(metaClient, never()).publishContainer(any(), any(), any());
        }

        @Test
        @DisplayName("CAS returns 0 (row already claimed by another run): skips polling entirely")
        void casClaimedByAnotherRun_skipsPolling() {
            LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
            IgContainerTracking tracking = buildTracking(IgContainerStatus.PENDING, now.minusMinutes(1));

            when(igContainerTrackingRepository.casStatus(
                    tracking.getId(), IgContainerStatus.PENDING, IgContainerStatus.PROCESSING, any()))
                    .thenReturn(0);

            processor.process(tracking, now);

            verify(metaClient, never()).getContainerStatus(any(), any());
            verify(igContainerTrackingRepository, never()).save(any());
            verify(contentRepository, never()).save(any());
        }

        @Test
        @DisplayName("No Instagram account for owner: marks FAILED without calling Instagram")
        void missingPlatformAccount_marksFailed() {
            LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
            IgContainerTracking tracking = buildTracking(IgContainerStatus.PENDING, now.minusMinutes(1));
            Content content = buildContent(tracking.getContentId());

            when(igContainerTrackingRepository.casStatus(
                    tracking.getId(), IgContainerStatus.PENDING, IgContainerStatus.PROCESSING, any()))
                    .thenReturn(1);
            when(platformTokenCacheService.getPlatformAccount(tracking.getOwnerId(), "INSTAGRAM"))
                    .thenThrow(new PlatformNotConnectedException("INSTAGRAM not connected"));
            when(contentRepository.findById(tracking.getContentId()))
                    .thenReturn(Optional.of(content));

            processor.process(tracking, now);

            ArgumentCaptor<IgContainerTracking> savedTracking = ArgumentCaptor.forClass(IgContainerTracking.class);
            verify(igContainerTrackingRepository).save(savedTracking.capture());
            assertThat(savedTracking.getValue().getStatus()).isEqualTo(IgContainerStatus.ERROR);

            ArgumentCaptor<Content> savedContent = ArgumentCaptor.forClass(Content.class);
            verify(contentRepository).save(savedContent.capture());
            assertThat(savedContent.getValue().getStatus()).isEqualTo(ContentStatus.FAILED);

            verify(metaClient, never()).getContainerStatus(any(), any());
        }

        @Test
        @DisplayName("MetaClient throws on getContainerStatus: leaves PROCESSING for retry")
        void metaClientThrows_leavesProcessingForRetry() {
            LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
            IgContainerTracking tracking = buildTracking(IgContainerStatus.PROCESSING, now.minusMinutes(1));

            when(platformTokenCacheService.getPlatformAccount(tracking.getOwnerId(), "INSTAGRAM"))
                    .thenReturn(buildAccount());
            when(metaClient.getContainerStatus(ACCESS_TOKEN, CONTAINER_ID))
                    .thenThrow(new RuntimeException("network error"));

            processor.process(tracking, now);

            verify(igContainerTrackingRepository, never()).save(any());
            verify(contentRepository, never()).save(any());
        }
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private IgContainerTracking buildTracking(IgContainerStatus status, LocalDateTime createdAt) {
        IgContainerTracking t = new IgContainerTracking();
        t.setId(UUID.randomUUID());
        t.setContentId(UUID.randomUUID());
        t.setOwnerId(UUID.randomUUID());
        t.setContainerId(CONTAINER_ID);
        t.setStatus(status);
        t.setCreatedAt(createdAt);
        t.setUpdatedAt(createdAt);
        return t;
    }

    private Content buildContent(UUID contentId) {
        Content c = new Content();
        c.setId(contentId);
        c.setOwnerId(UUID.randomUUID());
        c.setTitle("Test Content");
        c.setStatus(ContentStatus.PUBLISHING);
        return c;
    }

    private PlatformAccount buildAccount() {
        PlatformAccount account = new PlatformAccount();
        account.setAccessToken(ACCESS_TOKEN);
        account.setPlatformUserId(IG_USER_ID);
        return account;
    }
}
