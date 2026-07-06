'use client'

import { Box, Chip, CircularProgress, Skeleton, Typography } from '@mui/material'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined'
import YouTubeIcon from '@mui/icons-material/YouTube'
import InstagramIcon from '@mui/icons-material/Instagram'
import TwitterIcon from '@mui/icons-material/Twitter'
import Link from 'next/link'
import useSWR from 'swr'
import { fetchContentGaps } from '@/service/getService'
import { ContentGap, TrendingPlatform } from '@/lib/response/ai'

const cardSx = {
  backgroundColor: 'var(--th-bg-card)',
  border: '1px solid var(--th-border-card)',
  borderRadius: '12px',
  p: 3,
  boxShadow: 'var(--cf-card-shadow)',
}

const platformIcon: Record<TrendingPlatform, React.ReactNode> = {
  YOUTUBE: <YouTubeIcon sx={{ fontSize: 16, color: '#FF0000' }} />,
  INSTAGRAM: <InstagramIcon sx={{ fontSize: 16, color: '#E4405F' }} />,
  TWITTER: <TwitterIcon sx={{ fontSize: 16, color: '#1DA1F2' }} />,
}

export default function ContentGapCards() {
  const { data, isLoading, error } = useSWR<ContentGap[]>(
    '/api/ai/content-gaps',
    () => fetchContentGaps(),
    {
      revalidateOnFocus: false,
      dedupingInterval: 3_600_000,
    }
  )

  return (
    <Box sx={cardSx}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
        <TrendingUpOutlinedIcon sx={{ fontSize: 18, color: 'var(--cf-blue)' }} />
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-display)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--th-text-primary)',
            letterSpacing: '-0.374px',
          }}
        >
          Content Gaps
        </Typography>
        <Chip
          label="Trending"
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
        {isLoading && (
          <CircularProgress size={12} sx={{ color: 'var(--cf-blue)', ml: 'auto' }} />
        )}
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="rounded" height={44} sx={{ bgcolor: 'var(--th-border)' }} />
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
          Could not load content gaps right now. Try again later.
        </Typography>
      )}

      {data && !isLoading && data.length === 0 && (
        <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px' }}>
          No gaps found — either your niche isn&apos;t set yet (add it in Settings), or you&apos;re covering
          everything trending in your niche. Nice.
        </Typography>
      )}

      {data && !isLoading && data.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {data.map((gap, i) => (
            <Link
              key={`${gap.platform}-${gap.topic}`}
              href={`/dashboard/composer?topic=${encodeURIComponent(gap.topic)}`}
              style={{ textDecoration: 'none' }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  py: 1.25,
                  px: 1,
                  borderTop: i === 0 ? 'none' : '1px solid var(--th-border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: 'var(--th-input-bg)' },
                }}
              >
                {platformIcon[gap.platform]}
                <Box sx={{ minWidth: 0, flex: 1 }}>
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
                    Trending: {gap.topic}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'var(--cf-font-text)',
                      fontSize: 12,
                      color: 'var(--th-text-tertiary)',
                      letterSpacing: '-0.12px',
                      lineHeight: 1.4,
                      mt: 0.25,
                    }}
                  >
                    You haven&apos;t covered this topic
                  </Typography>
                </Box>
                <ArrowForwardOutlinedIcon sx={{ fontSize: 16, color: 'var(--cf-blue)', flexShrink: 0 }} />
              </Box>
            </Link>
          ))}
        </Box>
      )}
    </Box>
  )
}
