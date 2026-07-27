'use client'

import { useState } from 'react'
import { Box, Button, CircularProgress, Skeleton, Tooltip, Typography } from '@mui/material'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import useSWR from 'swr'
import { getThumbnailScores } from '@/service/getService'
import { retryThumbnailScoring, selectThumbnail } from '@/service/postService'
import { ThumbnailScoreResponse } from '@/lib/response/ai'
import { toApiError } from '@/service/errorService'

const POLL_INTERVAL_MS = 3_000

interface ThumbnailSelectorProps {
  /** The attached video media file. */
  mediaFileId: string
  /** Currently selected permanent thumbnail key (edit mode prefill). */
  thumbnailS3Key: string | null
  /** Called with the permanent S3 key after a frame is selected. */
  onSelected: (thumbnailS3Key: string) => void
}

/**
 * CF-96 AI thumbnail selector — rendered only for YOUTUBE targets with an
 * attached video (X/Instagram have no thumbnail concept). Polls the scoring
 * pipeline every 3 s until SCORED/FAILED; a 404 means no scoring exists for
 * this media file (e.g. an image, or an upload predating the pipeline) and the
 * panel renders nothing.
 */
export default function ThumbnailSelector({ mediaFileId, thumbnailS3Key, onSelected }: ThumbnailSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selectError, setSelectError] = useState<string | null>(null)

  const { data, error, isLoading, mutate } = useSWR<ThumbnailScoreResponse>(
    `/api/ai/score-thumbnail/${mediaFileId}`,
    () => getThumbnailScores(mediaFileId),
    {
      revalidateOnFocus: false,
      // Poll while the pipeline is running; stop once it reaches a final state.
      refreshInterval: (latest) =>
        latest && (latest.status === 'SCORED' || latest.status === 'FAILED') ? 0 : POLL_INTERVAL_MS,
    }
  )

  const notFound = error && toApiError(error).status === 404

  // No scoring row (image/audio attachment, or pre-pipeline upload) — show nothing.
  if (notFound) return null

  const bestIndex =
    data?.status === 'SCORED' && data.frames.length > 0
      ? data.frames.reduce((best, f) => (f.score > best.score ? f : best), data.frames[0]).frameIndex
      : null

  async function handlePick(frameIndex: number) {
    setSelecting(true)
    setSelectError(null)
    try {
      const res = await selectThumbnail({ mediaFileId, frameIndex })
      setSelectedIndex(frameIndex)
      onSelected(res.thumbnailS3Key)
    } catch (err) {
      setSelectError(toApiError(err).message ?? 'Could not select thumbnail')
    } finally {
      setSelecting(false)
    }
  }

  async function handleRetry() {
    setSelectError(null)
    try {
      await retryThumbnailScoring(mediaFileId)
      await mutate()
    } catch (err) {
      setSelectError(toApiError(err).message ?? 'Retry failed')
    }
  }

  const analyzing = isLoading || data?.status === 'PENDING' || data?.status === 'EXTRACTING'

  return (
    <Box sx={{ mt: 2, p: 2, border: '1px solid var(--th-border)', borderRadius: '10px' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <ImageOutlinedIcon sx={{ fontSize: 16, color: 'var(--cf-blue)' }} />
        <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, fontWeight: 600, color: 'var(--th-text-primary)', letterSpacing: '-0.224px' }}>
          AI Thumbnails
        </Typography>
        {analyzing && (
          <>
            <CircularProgress size={12} sx={{ color: 'var(--cf-blue)' }} />
            <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--th-text-tertiary)' }}>
              Analyzing your video…
            </Typography>
          </>
        )}
        {thumbnailS3Key && !analyzing && (
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--cf-blue)', ml: 'auto' }}>
            Thumbnail selected
          </Typography>
        )}
      </Box>

      {analyzing && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" sx={{ width: '100%', height: 'auto', aspectRatio: '16 / 9', bgcolor: 'var(--th-border)' }} />
          ))}
        </Box>
      )}

      {data?.status === 'FAILED' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: 'var(--th-text-tertiary)' }}>
            Couldn&apos;t analyze this video for thumbnails.
          </Typography>
          <Button size="small" startIcon={<ReplayOutlinedIcon sx={{ fontSize: 14 }} />} onClick={handleRetry} sx={{ textTransform: 'none', fontSize: 12 }}>
            Retry
          </Button>
        </Box>
      )}

      {data?.status === 'SCORED' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
          {data.frames.map((frame) => {
            const isPicked = selectedIndex === frame.frameIndex
            const isBest = bestIndex === frame.frameIndex
            return (
              <Tooltip key={frame.frameIndex} title={frame.reasoning} arrow>
                <Box
                  onClick={() => !selecting && handlePick(frame.frameIndex)}
                  sx={{
                    position: 'relative',
                    cursor: selecting ? 'wait' : 'pointer',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: isPicked
                      ? '2px solid var(--cf-blue)'
                      : isBest && selectedIndex === null
                        ? '2px solid rgba(0, 113, 227, 0.5)'
                        : '2px solid transparent',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={frame.previewUrl}
                    alt={`Thumbnail candidate ${frame.frameIndex + 1}`}
                    style={{ width: '100%', height: 'auto', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      px: 0.75,
                      py: 0.125,
                      borderRadius: '6px',
                      backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    }}
                  >
                    <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                      {frame.score}/10
                    </Typography>
                  </Box>
                  {isPicked && (
                    <CheckCircleIcon sx={{ position: 'absolute', bottom: 4, right: 4, fontSize: 18, color: 'var(--cf-blue)', backgroundColor: '#fff', borderRadius: '50%' }} />
                  )}
                </Box>
              </Tooltip>
            )
          })}
        </Box>
      )}

      {selectError && (
        <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--cf-red, #d32f2f)', mt: 1 }}>
          {selectError}
        </Typography>
      )}
    </Box>
  )
}
