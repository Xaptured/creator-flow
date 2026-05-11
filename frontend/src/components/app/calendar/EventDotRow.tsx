'use client'

import { Box, Tooltip, Typography } from '@mui/material'
import { ScheduledPost, PlatformType } from '@/lib/response/scheduler'

export const PLATFORM_COLORS: Record<PlatformType, string> = {
  [PlatformType.YOUTUBE]: '#FF0000',
  [PlatformType.INSTAGRAM]: '#E1306C',
  [PlatformType.TWITTER]: '#1DA1F2',
}

interface Props {
  events: ScheduledPost[]
}

const MAX_DOTS = 3

export default function EventDotRow({ events }: Props) {
  if (events.length === 0) return null

  const visible = events.slice(0, MAX_DOTS)
  const overflow = events.length - MAX_DOTS

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: '3px', mt: 0.5, flexWrap: 'nowrap' }}>
      {visible.map((post) => (
        <Tooltip key={post.id} title={`${post.platform} · ${post.title}`} arrow placement="top">
          <Box
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: PLATFORM_COLORS[post.platform] ?? 'var(--th-text-tertiary)',
              flexShrink: 0,
            }}
          />
        </Tooltip>
      ))}
      {overflow > 0 && (
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-text)',
            fontSize: 9,
            color: 'var(--th-text-tertiary)',
            lineHeight: 1,
            letterSpacing: 0,
          }}
        >
          +{overflow}
        </Typography>
      )}
    </Box>
  )
}
