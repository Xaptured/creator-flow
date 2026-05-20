'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Box,
  Typography,
  Button,
  Chip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import LinkOffOutlinedIcon from '@mui/icons-material/LinkOffOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { PlatformType } from '@/lib/response/scheduler'
import { PlatformStatusResponse } from '@/lib/response/platform'
import { getPlatformStatus, checkDisconnect } from '@/service/getService'
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
  const [checking, setChecking] = useState<PlatformType | null>(null)

  // Confirmation dialog state
  const [confirmPlatform, setConfirmPlatform] = useState<PlatformType | null>(null)
  const [scheduledCount, setScheduledCount] = useState(0)

  const statusMap = new Map<PlatformType, PlatformStatusResponse>()
  if (statuses) {
    for (const s of statuses) {
      statusMap.set(s.platform as PlatformType, s)
    }
  }

  function handleConnect(platform: PlatformType) {
    window.location.href = `/api/platforms/connect?platform=${platform.toLowerCase()}`
  }

  /** Called when the user clicks "Disconnect". Runs the check first. */
  async function handleDisconnectClick(platform: PlatformType) {
    setChecking(platform)
    try {
      const { scheduledCount: count } = await checkDisconnect(platform.toLowerCase())
      if (count > 0) {
        // Warn the user — open the confirmation dialog
        setScheduledCount(count)
        setConfirmPlatform(platform)
      } else {
        // Nothing at risk — disconnect immediately
        await executeDisconnect(platform)
      }
    } catch (err) {
      console.error('Failed to check platform disconnect', err)
    } finally {
      setChecking(null)
    }
  }

  /** Performs the actual disconnect after confirmation (or when count is 0). */
  async function executeDisconnect(platform: PlatformType) {
    setDisconnecting(platform)
    try {
      await disconnectPlatform(platform.toLowerCase())
      await mutate()
    } catch (err) {
      console.error('Failed to disconnect platform', err)
    } finally {
      setDisconnecting(null)
      setConfirmPlatform(null)
    }
  }

  function handleConfirmDisconnect() {
    if (confirmPlatform) {
      executeDisconnect(confirmPlatform)
    }
  }

  function handleCancelDisconnect() {
    setConfirmPlatform(null)
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
              const isChecking = checking === platformType

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
                        disabled={isDisconnecting || isChecking}
                        onClick={() => handleDisconnectClick(platformType)}
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
                        {isChecking ? 'Checking…' : isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
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

      {/* Disconnect confirmation dialog — shown only when scheduled posts exist */}
      <Dialog
        open={confirmPlatform !== null}
        onClose={handleCancelDisconnect}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--th-bg-card)',
            backgroundImage: 'none',
            border: '1px solid var(--th-border-card)',
            borderRadius: '12px',
            maxWidth: 420,
            width: '100%',
          },
        }}
      >
        <DialogTitle
          sx={{
            fontFamily: 'var(--cf-font-display)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--th-text-primary)',
            letterSpacing: '-0.2px',
            pb: 1,
          }}
        >
          Disconnect{confirmPlatform ? ` ${PLATFORM_META[confirmPlatform].name}` : ''}?
        </DialogTitle>

        <DialogContent sx={{ pt: '0 !important' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.5,
              p: 1.5,
              borderRadius: '8px',
              backgroundColor: 'rgba(255,159,10,0.08)',
              border: '1px solid rgba(255,159,10,0.2)',
              mb: 1,
            }}
          >
            <WarningAmberOutlinedIcon sx={{ fontSize: 18, color: '#ff9f0a', mt: '1px', flexShrink: 0 }} />
            <Typography
              sx={{
                fontFamily: 'var(--cf-font-text)',
                fontSize: 13,
                color: 'var(--th-text-secondary)',
                letterSpacing: '-0.12px',
                lineHeight: 1.5,
              }}
            >
              You have{' '}
              <Box component="span" sx={{ fontWeight: 600, color: 'var(--th-text-primary)' }}>
                {scheduledCount} scheduled {scheduledCount === 1 ? 'post' : 'posts'}
              </Box>{' '}
              targeting{' '}
              {confirmPlatform ? PLATFORM_META[confirmPlatform].name : 'this platform'}.
              Disconnecting will delete{' '}
              {scheduledCount === 1 ? 'it' : 'them'}.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={handleCancelDisconnect}
            sx={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: 13,
              fontWeight: 400,
              color: 'var(--th-text-secondary)',
              textTransform: 'none',
              borderRadius: '8px',
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={disconnecting !== null}
            onClick={handleConfirmDisconnect}
            sx={{
              backgroundColor: '#ff4040',
              color: '#ffffff',
              fontFamily: 'var(--cf-font-text)',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: '8px',
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#e03030', boxShadow: 'none' },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            {disconnecting !== null ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
