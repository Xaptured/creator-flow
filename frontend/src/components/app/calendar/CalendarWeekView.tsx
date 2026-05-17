'use client'

import { useState } from 'react'
import { Box, Typography } from '@mui/material'
import { useRouter } from 'next/navigation'
import { ScheduledPost } from '@/lib/response/scheduler'
import { toZonedTime } from 'date-fns-tz'
import { toLocalDatetimeLocal } from '@/lib/timezone/timezoneUtils'
import CalendarEvent from './CalendarEvent'

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const START_HOUR = 0
const END_HOUR = 23
const SLOTS_PER_HOUR = 2
const TOTAL_SLOTS = (END_HOUR - START_HOUR + 1) * SLOTS_PER_HOUR
const CELL_HEIGHT = 40

interface Props {
  year: number
  month: number
  weekStartDate: Date
  events: ScheduledPost[]
  userTimezone: string
  onEventDrop: (contentId: string, newDate: Date) => void
  onDayClick: (date: Date) => void
}

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
}

function slotLabel(slotIdx: number): string {
  if (slotIdx % SLOTS_PER_HOUR !== 0) return ''
  const hour = START_HOUR + Math.floor(slotIdx / SLOTS_PER_HOUR)
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

export default function CalendarWeekView({
  weekStartDate,
  events,
  userTimezone,
  onEventDrop,
  onDayClick,
}: Props) {
  const [dragOverSlot, setDragOverSlot] = useState<{ dayIdx: number; slotIdx: number } | null>(null)
  const router = useRouter()
  const weekDates = getWeekDates(weekStartDate)
  const now = new Date()

  const eventsByDaySlot = new Map<string, ScheduledPost[]>()
  for (const post of events) {
    const zonedDate = toZonedTime(new Date(post.scheduledAt), userTimezone)
    const dayIdx = weekDates.findIndex(
      (wd) =>
        wd.getFullYear() === zonedDate.getFullYear() &&
        wd.getMonth() === zonedDate.getMonth() &&
        wd.getDate() === zonedDate.getDate()
    )
    if (dayIdx === -1) continue
    const hour = zonedDate.getHours()
    const minute = zonedDate.getMinutes()
    if (hour < START_HOUR || hour > END_HOUR) continue
    const slotIdx = (hour - START_HOUR) * SLOTS_PER_HOUR + (minute >= 30 ? 1 : 0)
    const key = `${dayIdx}-${slotIdx}`
    if (!eventsByDaySlot.has(key)) eventsByDaySlot.set(key, [])
    eventsByDaySlot.get(key)!.push(post)
  }

  function handleDragOver(e: React.DragEvent, dayIdx: number, slotIdx: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverSlot({ dayIdx, slotIdx })
  }

  function handleDrop(e: React.DragEvent, dayIdx: number, slotIdx: number) {
    e.preventDefault()
    setDragOverSlot(null)
    const contentId = e.dataTransfer.getData('contentId')
    if (!contentId) return
    const newDate = new Date(weekDates[dayIdx])
    const hour = START_HOUR + Math.floor(slotIdx / SLOTS_PER_HOUR)
    const minute = (slotIdx % SLOTS_PER_HOUR) * 30
    newDate.setHours(hour, minute, 0, 0)
    onEventDrop(contentId, newDate)
  }

  function handleEventClick(post: ScheduledPost) {
    const localIso = toLocalDatetimeLocal(post.scheduledAt, userTimezone)
    router.push(`/dashboard/composer?date=${localIso}`)
  }

  return (
    <Box
      sx={{
        backgroundColor: 'var(--th-bg-card)',
        border: '1px solid var(--th-border-card)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '48px repeat(7, 1fr)',
          borderBottom: '1px solid var(--th-border)',
        }}
      >
        <Box />
        {weekDates.map((date, i) => {
          const isToday =
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate()
          return (
            <Box
              key={i}
              onClick={() => onDayClick(date)}
              sx={{
                py: 1.5,
                textAlign: 'center',
                cursor: 'pointer',
                borderLeft: '1px solid var(--th-border)',
                '&:hover': { backgroundColor: 'var(--th-bg-surface)' },
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--th-text-tertiary)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  mb: 0.25,
                }}
              >
                {DAYS_SHORT[i]}
              </Typography>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: isToday ? 'var(--cf-blue)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 13,
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? '#ffffff' : 'var(--th-text-secondary)',
                  }}
                >
                  {date.getDate()}
                </Typography>
              </Box>
            </Box>
          )
        })}
      </Box>

      <Box sx={{ overflowY: 'auto', maxHeight: '60vh' }}>
        {Array.from({ length: TOTAL_SLOTS }, (_, slotIdx) => {
          const label = slotLabel(slotIdx)
          const isHourBoundary = slotIdx % SLOTS_PER_HOUR === 0
          return (
            <Box
              key={slotIdx}
              sx={{
                display: 'grid',
                gridTemplateColumns: '48px repeat(7, 1fr)',
                borderBottom: isHourBoundary
                  ? '1px solid var(--th-border)'
                  : '1px dashed rgba(255,255,255,0.05)',
                minHeight: CELL_HEIGHT,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-end',
                  pr: 1,
                  pt: 0.25,
                }}
              >
                {label && (
                  <Typography
                    sx={{
                      fontFamily: 'var(--cf-font-text)',
                      fontSize: 10,
                      color: 'var(--th-text-tertiary)',
                      letterSpacing: '-0.1px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </Typography>
                )}
              </Box>

              {weekDates.map((_, dayIdx) => {
                const key = `${dayIdx}-${slotIdx}`
                const slotEvents = eventsByDaySlot.get(key) ?? []
                const isOver = dragOverSlot?.dayIdx === dayIdx && dragOverSlot?.slotIdx === slotIdx

                return (
                  <Box
                    key={dayIdx}
                    onDragOver={(e) => handleDragOver(e, dayIdx, slotIdx)}
                    onDragLeave={() => setDragOverSlot(null)}
                    onDrop={(e) => handleDrop(e, dayIdx, slotIdx)}
                    sx={{
                      borderLeft: '1px solid var(--th-border)',
                      p: '1px 2px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1px',
                      backgroundColor: isOver ? 'rgba(0,113,227,0.08)' : 'transparent',
                      outline: isOver ? '2px solid rgba(0,113,227,0.4)' : 'none',
                      outlineOffset: '-2px',
                      transition: 'background-color 0.1s',
                    }}
                  >
                    {slotEvents.map((post) => (
                      <CalendarEvent
                        key={post.id}
                        post={post}
                        compact={false}
                        onClick={() => handleEventClick(post)}
                      />
                    ))}
                  </Box>
                )
              })}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
