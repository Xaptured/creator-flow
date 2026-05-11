'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Box, Typography, Button, Chip, Skeleton } from '@mui/material'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import LinkOffOutlinedIcon from '@mui/icons-material/LinkOffOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { PlatformType } from '@/lib/response/scheduler'
import { PlatformStatusResponse } from '@/lib/response/platform'
import { getPlatformStatus } from '@/service/getService'
import { disconnectPlatform } from '@/service/deleteService'

const PLATFORM_META: Record<PlatformType, { name: string; description: string }> = {
  [PlatformType.YOUTUBE]: {
    name: 'YouTube',
    description: 'Publish videos, Shorts, and community posts.',
  },
  [PlatformType.INSTAGRAM]: {
    name: 'Instagram',
    description: 'Share Reels, feed posts, and Stories.',
  },
  [PlatformType.TWITTER]: {
    name: 'Twitter / X',
    description: 'Post tweets, threads, and media.',
  },
}

const ALL_PLATFORMS: PlatformType[] = [
  PlatformType.YOUTUBE,
  PlatformType.INSTAGRAM,
  PlatformType.TWITTER,
]

function deriveStatus(s: PlatformStatusResponse): 'connected' | 'disconnected' | 'expired' {
  if (!s.connected) return 'disconnected'
  if (s.tokenExpiry && new Date(s.tokenExpiry) < new Date()) return 'expired'
  return 'connected'
}

const statusConfig = {
  connected: {
    label: 'Connected',
    chipSx: {
      backgroundColor: 'rgba(48, 209, 88, 0.12)',
      color: '#30d158',
      border: '1px solid rgba(48,209,88,0.25)',
    },
  },
  disconnected: {
    label: 'Not connected',
    chipSx: {
      backgroundColor: 'var(--th-bg-surface)',
      color: 'var(--th-text-tertiary)',
      border: '1px solid var(--th-border)',
    },
  },
  expired: {
    label: 'Token expired',
    chipSx: {
      backgroundColor: 'rgba(255,159,10,0.12)',
      color: '#ff9f0a',
      border: '1px solid rgba(255,159,10,0.25)',
    },
  },
}

function PlatformCardSkeleton() {
  return (
    <Box
      sx={{
        backgroundColor: 'var(--th-bg-card)',
        border: '1px solid var(--th-border-card)',
        borderRadius: '12px',
        p: 3,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Skeleton variant="rounded" width={44} height={44} sx={{ borderRadius: '10px', flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width={120} height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width={240} height={16} />
      </Box>
      <Skeleton variant="rounded" width={90} height={32} sx={{ borderRadius: '8px' }} />
    </Box>
  )
}

export default function PlatformsView() {
  const { data: statuses, isLoading, mutate } = useSWR<PlatformStatusResponse[]>(
    '/api/platforms/status',
    getPlatformStatus,
    { revalidateOnFocus: true }
  )

  const [disconnecting, setDisconnecting] = useState<PlatformType | null>(null)

  const statusMap = new Map<PlatformType, PlatformStatusResponse>()
  if (statuses) {
    for (const s of statuses) {
      statusMap.set(s.platform as PlatformType, s)
    }
  }

  function handleConnect(platform: PlatformType) {
    window.location.href = `/api/platforms/connect?platform=${platform.toLowerCase()}`
  }

  async function handleDisconnect(platform: PlatformType) {
    setDisconnecting(platform)
    try {
      await disconnectPlatform(platform.toLowerCase())
      await mutate()
    } catch (err) {
      console.error('Failed to disconnect platform', err)
    } finally {
      setDisconnecting(null)
    }
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
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
          Platforms
        </Typography>
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-text)',
            fontSize: 14,
            color: 'var(--th-text-secondary)',
            letterSpacing: '-0.224px',
            mt: 0.5,
          }}
        >
          Connect your social platforms to enable scheduling and analytics.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 640 }}>
        {isLoading
          ? ALL_PLATFORMS.map((p) => <PlatformCardSkeleton key={p} />)
          : ALL_PLATFORMS.map((platformType) => {
              const raw = statusMap.get(platformType) ?? {
                platform: platformType,
                connected: false,
              }
              const status = deriveStatus(raw)
              const { label, chipSx } = statusConfig[status]
              const isConnected = status === 'connected'
              const isExpired = status === 'expired'
              const meta = PLATFORM_META[platformType]
              const isDisconnecting = disconnecting === platformType

              return (
                <Box
                  key={platformType}
                  sx={{
                    backgroundColor: 'var(--th-bg-card)',
                    border: '1px solid var(--th-border-card)',
                    borderRadius: '12px',
                    p: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '10px',
                      backgroundColor: 'var(--th-bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: 'var(--cf-font-display)',
                        fontSize: 13,
                        fontWeight: 700,
                        color: 'var(--th-text-tertiary)',
                        letterSpacing: '-0.12px',
                      }}
                    >
                      {meta.name[0]}
                    </Typography>
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography
                        sx={{
                          fontFamily: 'var(--cf-font-display)',
                          fontSize: 15,
                          fontWeight: 600,
                          color: 'var(--th-text-primary)',
                          letterSpacing: '-0.2px',
                        }}
                      >
                        {meta.name}
                      </Typography>
                      <Chip
                        label={label}
                        size="small"
                        sx={{
                          ...chipSx,
                          fontFamily: 'var(--cf-font-text)',
                          fontSize: 11,
                          fontWeight: 600,
                          height: 20,
                        }}
                      />
                      {isExpired && (
                        <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: '#ff9f0a' }} />
                      )}
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: 'var(--cf-font-text)',
                        fontSize: 13,
                        color: 'var(--th-text-tertiary)',
                        letterSpacing: '-0.12px',
                      }}
                    >
                      {meta.description}
                    </Typography>
                    {isExpired && raw.tokenExpiry && (
                      <Typography
                        sx={{
                          fontFamily: 'var(--cf-font-text)',
                          fontSize: 12,
                          color: '#ff9f0a',
                          letterSpacing: '-0.12px',
                          mt: 0.5,
                        }}
                      >
                        Token expired {new Date(raw.tokenExpiry).toLocaleDateString()}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                    {isConnected && (
                      <Button
                        variant="outlined"
                        startIcon={<LinkOffOutlinedIcon />}
                        size="small"
                        disabled={isDisconnecting}
                        onClick={() => handleDisconnect(platformType)}
                        sx={{
                          color: 'var(--th-text-tertiary)',
                          borderColor: 'var(--th-border)',
                          fontFamily: 'var(--cf-font-text)',
                          fontSize: 13,
                          fontWeight: 400,
                          borderRadius: '8px',
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: '#ff4040',
                            color: '#ff4040',
                            backgroundColor: 'rgba(255,64,64,0.06)',
                          },
                          '&:disabled': { opacity: 0.5 },
                        }}
                      >
                        {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
                      </Button>
                    )}

                    {!isConnected && (
                      <Button
                        variant="contained"
                        startIcon={<LinkOutlinedIcon />}
                        size="small"
                        onClick={() => handleConnect(platformType)}
                        sx={{
                          backgroundColor: 'var(--cf-blue)',
                          color: '#ffffff',
                          fontFamily: 'var(--cf-font-text)',
                          fontSize: 13,
                          fontWeight: 400,
                          borderRadius: '8px',
                          textTransform: 'none',
                          boxShadow: 'none',
                          '&:hover': { backgroundColor: '#0077ed', boxShadow: 'none' },
                        }}
                      >
                        {isExpired ? 'Reconnect' : 'Connect'}
                      </Button>
                    )}
                  </Box>
                </Box>
              )
            })}
      </Box>
    </Box>
  )
}
