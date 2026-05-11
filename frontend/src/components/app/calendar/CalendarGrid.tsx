'use client'

import { Box, Typography } from '@mui/material'
import { ScheduledPost } from '@/lib/response/scheduler'
import CalendarCell from './CalendarCell'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  cells: (number | null)[]
  year: number
  month: number
  events: ScheduledPost[]
  onEventDrop: (contentId: string, newDate: Date) => void
  onDayClick: (date: Date) => void
}

export default function CalendarGrid({
  cells,
  year,
  month,
  events,
  onEventDrop,
  onDayClick,
}: Props) {
  const eventsByDay = new Map<number, ScheduledPost[]>()
  for (const post of events) {
    const d = new Date(post.scheduledAt)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!eventsByDay.has(day)) eventsByDay.set(day, [])
      eventsByDay.get(day)!.push(post)
    }
  }

  const totalCells = cells.length

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
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--th-border)',
        }}
      >
        {DAYS.map((day) => (
          <Box key={day} sx={{ py: 1.5, textAlign: 'center' }}>
            <Typography
              sx={{
                fontFamily: 'var(--cf-font-text)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--th-text-tertiary)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              {day}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {cells.map((day, idx) => {
          const colIdx = idx % 7
          const rowIdx = Math.floor(idx / 7)
          const totalRows = Math.floor(totalCells / 7)
          const isLastRow = rowIdx === totalRows - 1
          const isLastCol = colIdx === 6
          const isWeekend = colIdx >= 5

          const now = new Date()
          const isToday =
            day !== null &&
            year === now.getFullYear() &&
            month === now.getMonth() &&
            day === now.getDate()

          const date = day !== null ? new Date(year, month, day) : null
          const dayEvents = day !== null ? (eventsByDay.get(day) ?? []) : []

          return (
            <CalendarCell
              key={idx}
              day={day}
              date={date}
              isToday={isToday}
              isWeekend={isWeekend}
              isLastRow={isLastRow}
              isLastCol={isLastCol}
              events={dayEvents}
              onDrop={onEventDrop}
              onDayClick={onDayClick}
            />
          )
        })}
      </Box>
    </Box>
  )
}
