'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Box, Typography, Button, ToggleButton, ToggleButtonGroup, Chip } from '@mui/material'
import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import ChevronLeftOutlinedIcon from '@mui/icons-material/ChevronLeftOutlined'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'
import Link from 'next/link'
import { ScheduledPost, PlatformType } from '@/lib/response/scheduler'
import { getScheduledContent, getUserPreferences } from '@/service/getService'
import { rescheduleContent } from '@/service/putService'
import { toApiError } from '@/service/errorService'
import { toUtcIso } from '@/lib/timezone/timezoneUtils'
import CalendarGrid from './CalendarGrid'
import CalendarWeekView from './CalendarWeekView'

type ViewMode = 'month' | 'week'

const PLATFORMS: PlatformType[] = [PlatformType.YOUTUBE, PlatformType.INSTAGRAM, PlatformType.TWITTER]
const PLATFORM_LABELS: Record<PlatformType, string> = {
  [PlatformType.YOUTUBE]: 'YouTube',
  [PlatformType.INSTAGRAM]: 'Instagram',
  [PlatformType.TWITTER]: 'Twitter/X',
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return (day + 6) % 7
}

function getWeekStart(year: number, month: number, referenceDay: number): Date {
  const d = new Date(year, month, referenceDay)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return d
}

export default function CalendarView() {
  const router = useRouter()
  const now = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [activePlatforms, setActivePlatforms] = useState<Set<PlatformType>>(new Set(PLATFORMS))
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)

  const { data: preferences } = useSWR(
    '/api/user/preferences',
    getUserPreferences,
    { revalidateOnFocus: false }
  )
  const userTimezone = preferences?.timezone ?? 'UTC'

  const {
    data: allPosts = [],
    mutate,
    isLoading,
  } = useSWR<ScheduledPost[]>('/api/scheduler/content', getScheduledContent, {
    revalidateOnFocus: true,
  })

  const posts = allPosts.filter((p) => activePlatforms.has(p.platform))

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) }
    else setMonth((m) => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const weekStartDate = getWeekStart(year, month, now.getMonth() === month ? now.getDate() : 1)

  async function handleEventDrop(contentId: string, newDate: Date) {
    setRescheduleError(null)
    const previous = allPosts
    const pad = (n: number) => String(n).padStart(2, '0')
    const localDatetimeStr = `${newDate.getFullYear()}-${pad(newDate.getMonth() + 1)}-${pad(newDate.getDate())}T${pad(newDate.getHours())}:${pad(newDate.getMinutes())}`
    const newIso = toUtcIso(localDatetimeStr, userTimezone)
    mutate(
      allPosts.map((p) => (p.id === contentId ? { ...p, scheduledAt: newIso } : p)),
      false
    )
    try {
      await rescheduleContent(contentId, newIso)
      mutate()
    } catch (err) {
      mutate(previous, false)
      const apiErr = toApiError(err)
      setRescheduleError(apiErr.message ?? 'Failed to reschedule post')
    }
  }

  function handleDayClick(date: Date) {
    const pad = (n: number) => String(n).padStart(2, '0')
    const localIso = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`
    router.push(`/dashboard/composer?date=${localIso}`)
  }

  const togglePlatform = (p: PlatformType) =>
    setActivePlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(p)) { next.delete(p) } else { next.add(p) }
      return next
    })

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-display)',
            fontSize: { xs: 24, sm: 28 },
            fontWeight: 600,
            color: 'var(--th-text-primary)',
            letterSpacing: '-0.28px',
            lineHeight: 1.14,
          }}
        >
          Calendar
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {PLATFORMS.map((p) => {
            const active = activePlatforms.has(p)
            return (
              <Chip
                key={p}
                label={PLATFORM_LABELS[p]}
                onClick={() => togglePlatform(p)}
                size="small"
                sx={{
                  backgroundColor: active ? 'rgba(0, 113, 227, 0.15)' : 'var(--th-bg-surface)',
                  color: active ? 'var(--cf-blue)' : 'var(--th-text-secondary)',
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  border: '1px solid',
                  borderColor: active ? 'rgba(0,113,227,0.3)' : 'var(--th-border)',
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.85 },
                }}
              />
            )
          })}

          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                fontFamily: 'var(--cf-font-text)',
                fontSize: 12,
                color: 'var(--th-text-secondary)',
                borderColor: 'var(--th-border)',
                textTransform: 'none',
                px: 1.5,
                py: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'var(--cf-blue)',
                  color: '#ffffff',
                  '&:hover': { backgroundColor: '#0077ed' },
                },
              },
            }}
          >
            <ToggleButton value="month">Month</ToggleButton>
            <ToggleButton value="week">Week</ToggleButton>
          </ToggleButtonGroup>

          <Button
            component={Link}
            href="/dashboard/composer"
            variant="contained"
            startIcon={<AddOutlinedIcon />}
            sx={{
              backgroundColor: 'var(--cf-blue)',
              color: '#ffffff',
              fontFamily: 'var(--cf-font-text)',
              fontSize: 14,
              fontWeight: 400,
              borderRadius: '8px',
              px: 2,
              py: 0.75,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#0077ed', boxShadow: 'none' },
            }}
          >
            New Post
          </Button>
        </Box>
      </Box>

      {rescheduleError && (
        <Box
          sx={{
            mb: 2,
            px: 2,
            py: 1,
            backgroundColor: 'rgba(255,64,64,0.1)',
            border: '1px solid rgba(255,64,64,0.3)',
            borderRadius: '8px',
          }}
        >
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: '#ff4040' }}>
            {rescheduleError}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          mb: 2,
          backgroundColor: 'var(--th-bg-card)',
          border: '1px solid var(--th-border-card)',
          borderRadius: '12px',
          px: 2,
          py: 1.5,
        }}
      >
        <Box
          component="button"
          onClick={prevMonth}
          sx={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            p: 0.5,
            borderRadius: '6px',
            color: 'var(--th-text-secondary)',
            '&:hover': { backgroundColor: 'var(--th-bg-surface)', color: 'var(--th-text-primary)' },
          }}
        >
          <ChevronLeftOutlinedIcon fontSize="small" />
        </Box>

        <Typography
          sx={{
            fontFamily: 'var(--cf-font-display)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--th-text-primary)',
            letterSpacing: '-0.374px',
            flex: 1,
            textAlign: 'center',
          }}
        >
          {MONTH_NAMES[month]} {year}
        </Typography>

        <Box
          component="button"
          onClick={nextMonth}
          sx={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            p: 0.5,
            borderRadius: '6px',
            color: 'var(--th-text-secondary)',
            '&:hover': { backgroundColor: 'var(--th-bg-surface)', color: 'var(--th-text-primary)' },
          }}
        >
          <ChevronRightOutlinedIcon fontSize="small" />
        </Box>
      </Box>

      {isLoading && (
        <Box
          sx={{
            height: 400,
            backgroundColor: 'var(--th-bg-card)',
            border: '1px solid var(--th-border-card)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: 'var(--th-text-tertiary)' }}>
            Loading...
          </Typography>
        </Box>
      )}

      {!isLoading && viewMode === 'month' && (
        <CalendarGrid
          cells={cells}
          year={year}
          month={month}
          events={posts}
          userTimezone={userTimezone}
          onEventDrop={handleEventDrop}
          onDayClick={handleDayClick}
        />
      )}

      {!isLoading && viewMode === 'week' && (
        <CalendarWeekView
          year={year}
          month={month}
          weekStartDate={weekStartDate}
          events={posts}
          userTimezone={userTimezone}
          onEventDrop={handleEventDrop}
          onDayClick={handleDayClick}
        />
      )}
    </Box>
  )
}
