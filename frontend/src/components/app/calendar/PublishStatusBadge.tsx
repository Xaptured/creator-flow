'use client'

import { Box, Tooltip } from '@mui/material'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import useSWR from 'swr'
import { ContentStatus } from '@/lib/response/scheduler'
import { getContentStatus } from '@/service/getService'

interface Props {
  contentId: string
  initialStatus: ContentStatus
}

const TERMINAL = new Set([ContentStatus.PUBLISHED, ContentStatus.FAILED])
const POLL_INTERVAL_MS = 5000

export default function PublishStatusBadge({ contentId, initialStatus }: Props) {
  const shouldPoll = !TERMINAL.has(initialStatus)

  const { data } = useSWR(
    shouldPoll ? `/api/scheduler/content/${contentId}/status` : null,
    () => getContentStatus(contentId),
    { refreshInterval: POLL_INTERVAL_MS, revalidateOnFocus: false }
  )

  const status = data?.status ?? initialStatus

  if (status === ContentStatus.PUBLISHED) {
    return (
      <Tooltip title="Published" arrow>
        <CheckCircleOutlinedIcon sx={{ fontSize: 11, color: '#30d158', flexShrink: 0 }} />
      </Tooltip>
    )
  }

  if (status === ContentStatus.FAILED) {
    return (
      <Tooltip title="Publish failed" arrow>
        <ErrorOutlineOutlinedIcon sx={{ fontSize: 11, color: '#ff4040', flexShrink: 0 }} />
      </Tooltip>
    )
  }

  if (status === ContentStatus.PUBLISHING) {
    return (
      <Tooltip title="Publishing…" arrow>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: 'var(--cf-blue)',
            flexShrink: 0,
            animation: 'cf-pulse 1.2s ease-in-out infinite',
            '@keyframes cf-pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.3 },
            },
          }}
        />
      </Tooltip>
    )
  }

  return (
    <Tooltip title="Scheduled" arrow>
      <ScheduleOutlinedIcon sx={{ fontSize: 11, color: 'var(--th-text-tertiary)', flexShrink: 0 }} />
    </Tooltip>
  )
}
