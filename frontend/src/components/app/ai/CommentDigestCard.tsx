'use client'

import { Box, Chip, CircularProgress, IconButton, Skeleton, Tooltip, Typography } from '@mui/material'
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined'
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined'
import useSWR from 'swr'
import { generateCommentDigest } from '@/service/postService'
import { CommentDigestResponse } from '@/lib/response/ai'

const cardSx = {
  backgroundColor: 'var(--th-bg-card)',
  border: '1px solid var(--th-border-card)',
  borderRadius: '12px',
  p: 3,
  boxShadow: 'var(--cf-card-shadow)',
}

/**
 * Comment Digest (CF-96): top audience questions + content ideas distilled
 * from recent comments across the creator's whole YouTube channel — not tied
 * to a single post. Generation is a paid Claude call, so results are cached
 * client-side for an hour and only refetched on explicit refresh.
 */
export default function CommentDigestCard() {
  const { data, isLoading, isValidating, error, mutate } = useSWR<CommentDigestResponse>(
    '/api/ai/comment-digest',
    generateCommentDigest,
    {
      revalidateOnFocus: false,
      // Cache for 1 hour — digest generation is expensive; refetch only on demand
      dedupingInterval: 3_600_000,
    }
  )

  const busy = isLoading || isValidating

  return (
    <Box sx={cardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <ForumOutlinedIcon sx={{ fontSize: 18, color: 'var(--cf-blue)' }} />
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-display)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--th-text-primary)',
            letterSpacing: '-0.374px',
          }}
        >
          Comment Digest
        </Typography>
        <Chip
          label="Audience ideas"
          size="small"
          sx={{
            backgroundColor: 'rgba(0, 113, 227, 0.15)',
            color: 'var(--cf-blue)',
            fontFamily: 'var(--cf-font-text)',
            fontSize: 11,
            fontWeight: 600,
            height: 20,
          }}
        />
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          {busy && <CircularProgress size={12} sx={{ color: 'var(--cf-blue)' }} />}
          <Tooltip title="Regenerate digest">
            <span>
              <IconButton size="small" onClick={() => mutate()} disabled={busy} sx={{ p: 0.5 }}>
                <RefreshOutlinedIcon sx={{ fontSize: 16, color: 'var(--th-text-tertiary)' }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[0, 1, 2].map((i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Skeleton variant="circular" width={6} height={6} sx={{ mt: '7px', flexShrink: 0, bgcolor: 'var(--th-border)' }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="70%" sx={{ bgcolor: 'var(--th-border)', mb: 0.5 }} />
                <Skeleton variant="text" width="90%" sx={{ bgcolor: 'var(--th-border)' }} />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {error && !isLoading && (
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-text)',
            fontSize: 13,
            color: 'var(--th-text-tertiary)',
            letterSpacing: '-0.12px',
          }}
        >
          Could not build the comment digest right now. Try again in a bit.
        </Typography>
      )}

      {data && !isLoading && data.items.length === 0 && (
        <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px' }}>
          No recent YouTube comments yet — connect YouTube or check back after your next upload.
        </Typography>
      )}

      {data && !isLoading && data.items.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {data.items.map((item, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                gap: 1.25,
                alignItems: 'flex-start',
                py: 1.25,
                borderTop: i === 0 ? 'none' : '1px solid var(--th-border)',
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--cf-blue)', mt: '8px', flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--th-text-primary)',
                    letterSpacing: '-0.224px',
                    lineHeight: 1.4,
                  }}
                >
                  {item.question}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 12,
                    color: 'var(--cf-blue)',
                    letterSpacing: '-0.12px',
                    lineHeight: 1.4,
                    mt: 0.25,
                  }}
                >
                  → {item.idea}
                </Typography>
              </Box>
            </Box>
          ))}
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: 11,
              color: 'var(--th-text-tertiary)',
              letterSpacing: '-0.12px',
              mt: 1.5,
            }}
          >
            From your last {data.commentCount} YouTube comments
          </Typography>
        </Box>
      )}
    </Box>
  )
}
