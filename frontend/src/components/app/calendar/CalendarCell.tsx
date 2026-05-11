'use client'

import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { ScheduledPost } from '@/lib/response/scheduler'
import CalendarEvent from './CalendarEvent'

interface Props {
  day: number | null
  date: Date | null
  isToday: boolean
  isWeekend: boolean
  isLastRow: boolean
  isLastCol: boolean
  events: ScheduledPost[]
  onDrop: (contentId: string, newDate: Date) => void
  onDayClick: (date: Date) => void
}

export default function CalendarCell({
  day,
  date,
  isToday,
  isWeekend,
  isLastRow,
  isLastCol,
  events,
  onDrop,
  onDayClick,
}: Props) {
  const [dragOver, setDragOver] = useState(false)
  const router = useRouter()

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    if (!date) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOver(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    if (!date) return
    const contentId = e.dataTransfer.getData('contentId')
    if (contentId) onDrop(contentId, date)
  }

  function handleEventClick(post: ScheduledPost) {
    const d = new Date(post.scheduledAt)
    const pad = (n: number) => String(n).padStart(2, '0')
    const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`
    router.push(`/dashboard/composer?date=${localIso}`)
  }

  return (
    <Box
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => date && onDayClick(date)}
      sx={{
        minHeight: 80,
        borderRight: !isLastCol ? '1px solid var(--th-border)' : 'none',
        borderBottom: !isLastRow ? '1px solid var(--th-border)' : 'none',
        p: 0.75,
        position: 'relative',
        cursor: day ? 'pointer' : 'default',
        backgroundColor: dragOver
          ? 'rgba(0,113,227,0.08)'
          : isWeekend && day
          ? 'rgba(255,255,255,0.02)'
          : 'transparent',
        outline: dragOver ? '2px solid rgba(0,113,227,0.4)' : 'none',
        outlineOffset: '-2px',
        transition: 'background-color 0.1s, outline 0.1s',
        '&:hover': day
          ? { backgroundColor: dragOver ? 'rgba(0,113,227,0.08)' : 'var(--th-bg-surface)' }
          : {},
      }}
    >
      {day && (
        <>
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: 12,
              fontWeight: isToday ? 700 : 400,
              color: isToday ? '#ffffff' : 'var(--th-text-secondary)',
              letterSpacing: '-0.1px',
              width: 22,
              height: 22,
              borderRadius: '50%',
              backgroundColor: isToday ? 'var(--cf-blue)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 0.5,
            }}
          >
            {day}
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {events.map((post) => (
              <CalendarEvent
                key={post.id}
                post={post}
                compact={false}
                onClick={() => handleEventClick(post)}
              />
            ))}
          </Box>
        </>
      )}
    </Box>
  )
}
