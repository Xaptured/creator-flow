'use client'

import { Box, Typography } from '@mui/material'
import { ScheduledPost } from '@/lib/response/scheduler'
import { PLATFORM_COLORS } from './EventDotRow'
import PublishStatusBadge from './PublishStatusBadge'

interface Props {
  post: ScheduledPost
  compact?: boolean
  onClick?: () => void
}

export default function CalendarEvent({ post, compact = true, onClick }: Props) {
  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData('contentId', post.id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    onClick?.()
  }

  const color = PLATFORM_COLORS[post.platform] ?? 'var(--th-text-tertiary)'

  if (compact) {
    return (
      <Box
        draggable
        onDragStart={handleDragStart}
        onClick={handleClick}
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
          cursor: 'grab',
          flexShrink: 0,
          '&:active': { cursor: 'grabbing' },
        }}
      />
    )
  }

  return (
    <Box
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        backgroundColor: `${color}22`,
        border: `1px solid ${color}55`,
        borderRadius: '6px',
        px: 0.75,
        py: 0.375,
        cursor: 'pointer',
        minWidth: 0,
        '&:active': { opacity: 0.75 },
        '&:hover': { backgroundColor: `${color}44` },
        transition: 'background-color 0.1s',
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <Typography
        noWrap
        sx={{
          fontFamily: 'var(--cf-font-text)',
          fontSize: 11,
          color: 'var(--th-text-primary)',
          letterSpacing: '-0.1px',
          flex: 1,
          minWidth: 0,
        }}
      >
        {post.title}
      </Typography>
      <PublishStatusBadge contentId={post.id} initialStatus={post.status} />
    </Box>
  )
}
