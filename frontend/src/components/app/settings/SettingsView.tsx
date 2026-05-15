'use client'

import { useState } from 'react'
import useSWR from 'swr'
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Divider,
  Chip,
  Skeleton,
  Grid,
  Alert,
} from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import LinkOffOutlinedIcon from '@mui/icons-material/LinkOffOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import YouTubeIcon from '@mui/icons-material/YouTube'
import InstagramIcon from '@mui/icons-material/Instagram'
import TwitterIcon from '@mui/icons-material/Twitter'
import { PlatformType } from '@/lib/response/scheduler'
import { PlatformStatusResponse } from '@/lib/response/platform'
import { getPlatformStatus, getUserPreferences } from '@/service/getService'
import { disconnectPlatform } from '@/service/deleteService'
import { updateUserPreferences } from '@/service/putService'
import { toApiError } from '@/service/errorService'

const cardSx = {
  backgroundColor: 'var(--th-bg-card)',
  border: '1px solid var(--th-border-card)',
  borderRadius: '12px',
  p: 3,
}

const inputSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: 'var(--cf-font-text)',
    fontSize: 14,
    color: 'var(--th-text-primary)',
    backgroundColor: 'var(--th-input-bg)',
    borderRadius: '8px',
    '& fieldset': { borderColor: 'var(--th-input-border)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--cf-blue)' },
  },
  '& .MuiInputLabel-root': {
    fontFamily: 'var(--cf-font-text)',
    fontSize: 14,
    color: 'var(--th-text-tertiary)',
    '&.Mui-focused': { color: 'var(--cf-blue)' },
  },
}

const selectSx = {
  ...inputSx,
  '& .MuiSelect-icon': { color: 'var(--th-text-tertiary)' },
  '& .MuiSelect-select': {
    fontFamily: 'var(--cf-font-text)',
    fontSize: 14,
    color: 'var(--th-text-primary)',
  },
}

const menuPaperSx = {
  backgroundColor: 'var(--th-bg-card)',
  border: '1px solid var(--th-border)',
  borderRadius: '8px',
  maxHeight: 300,
  '& .MuiMenuItem-root': {
    fontFamily: 'var(--cf-font-text)',
    fontSize: 14,
    color: 'var(--th-text-secondary)',
    '&:hover': { backgroundColor: 'var(--th-bg-surface)' },
    '&.Mui-selected': {
      backgroundColor: 'rgba(0,113,227,0.12)',
      color: 'var(--cf-blue)',
      '&:hover': { backgroundColor: 'rgba(0,113,227,0.18)' },
    },
  },
}

const sectionHeadSx = {
  fontFamily: 'var(--cf-font-display)',
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--th-text-primary)',
  letterSpacing: '-0.2px',
  mb: 2.5,
}

const CONTENT_NICHES = [
  'Gaming', 'Photography', 'Tech', 'Lifestyle', 'Travel',
  'Fitness', 'Food', 'Education', 'Business', 'Art & Design', 'Other',
]

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore',
  'Asia/Tokyo', 'Australia/Sydney',
]

const ALL_PLATFORMS: PlatformType[] = [
  PlatformType.YOUTUBE,
  PlatformType.INSTAGRAM,
  PlatformType.TWITTER,
]

interface PlatformMeta {
  name: string
  description: string
  icon: React.ReactNode
  accentColor: string
  accentBg: string
}

const PLATFORM_META: Record<PlatformType, PlatformMeta> = {
  [PlatformType.YOUTUBE]: {
    name: 'YouTube',
    description: 'Publish videos, Shorts, and community posts.',
    icon: <YouTubeIcon sx={{ fontSize: 20 }} />,
    accentColor: '#ff3b30',
    accentBg: 'rgba(255,59,48,0.10)',
  },
  [PlatformType.INSTAGRAM]: {
    name: 'Instagram',
    description: 'Share Reels, feed posts, and Stories.',
    icon: <InstagramIcon sx={{ fontSize: 20 }} />,
    accentColor: '#bf5af2',
    accentBg: 'rgba(191,90,242,0.10)',
  },
  [PlatformType.TWITTER]: {
    name: 'Twitter / X',
    description: 'Post tweets, threads, and media.',
    icon: <TwitterIcon sx={{ fontSize: 20 }} />,
    accentColor: '#0071e3',
    accentBg: 'rgba(0,113,227,0.10)',
  },
}

function deriveStatus(s: PlatformStatusResponse): 'connected' | 'disconnected' | 'expired' {
  if (!s.connected) return 'disconnected'
  if (s.tokenExpiry && new Date(s.tokenExpiry) < new Date()) return 'expired'
  return 'connected'
}

const statusConfig = {
  connected: {
    label: 'Connected',
    chipSx: {
      backgroundColor: 'rgba(48,209,88,0.12)',
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
    <Box sx={{ ...cardSx, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Skeleton variant="rounded" width={40} height={40} sx={{ borderRadius: '10px', flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width={100} height={20} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="85%" height={15} />
      </Box>
      <Skeleton variant="rounded" width={84} height={32} sx={{ borderRadius: '8px', flexShrink: 0 }} />
    </Box>
  )
}

interface PlatformCardProps {
  platformType: PlatformType
  raw: PlatformStatusResponse
  disconnecting: PlatformType | null
  onConnect: (p: PlatformType) => void
  onDisconnect: (p: PlatformType) => void
}

function PlatformCard({ platformType, raw, disconnecting, onConnect, onDisconnect }: PlatformCardProps) {
  const status = deriveStatus(raw)
  const { label, chipSx } = statusConfig[status]
  const isConnected = status === 'connected'
  const isExpired = status === 'expired'
  const meta = PLATFORM_META[platformType]
  const isDisconnecting = disconnecting === platformType

  return (
    <Box
      sx={{
        ...cardSx,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        transition: 'border-color 0.15s ease',
        '&:hover': {
          borderColor: isConnected ? 'rgba(48,209,88,0.35)' : 'var(--th-border)',
        },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          backgroundColor: meta.accentBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: meta.accentColor,
        }}
      >
        {meta.icon}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-display)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--th-text-primary)',
              letterSpacing: '-0.16px',
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
              fontSize: 10,
              fontWeight: 600,
              height: 18,
            }}
          />
          {isExpired && (
            <WarningAmberOutlinedIcon sx={{ fontSize: 13, color: '#ff9f0a' }} />
          )}
        </Box>
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-text)',
            fontSize: 12,
            color: 'var(--th-text-tertiary)',
            letterSpacing: '-0.12px',
            lineHeight: 1.4,
          }}
        >
          {meta.description}
        </Typography>
        {isExpired && raw.tokenExpiry && (
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: 11,
              color: '#ff9f0a',
              letterSpacing: '-0.08px',
              mt: 0.5,
            }}
          >
            Expired {new Date(raw.tokenExpiry).toLocaleDateString()}
          </Typography>
        )}
      </Box>

      <Box sx={{ flexShrink: 0 }}>
        {isConnected ? (
          <Button
            variant="outlined"
            startIcon={<LinkOffOutlinedIcon sx={{ fontSize: '14px !important' }} />}
            size="small"
            disabled={isDisconnecting}
            onClick={() => onDisconnect(platformType)}
            sx={{
              color: 'var(--th-text-tertiary)',
              borderColor: 'var(--th-border)',
              fontFamily: 'var(--cf-font-text)',
              fontSize: 12,
              fontWeight: 400,
              borderRadius: '8px',
              textTransform: 'none',
              whiteSpace: 'nowrap',
              '&:hover': { borderColor: '#ff4040', color: '#ff4040', backgroundColor: 'rgba(255,64,64,0.06)' },
              '&.Mui-disabled': { opacity: 0.5 },
            }}
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<LinkOutlinedIcon sx={{ fontSize: '14px !important' }} />}
            size="small"
            onClick={() => onConnect(platformType)}
            sx={{
              backgroundColor: 'var(--cf-blue)',
              color: '#ffffff',
              fontFamily: 'var(--cf-font-text)',
              fontSize: 12,
              fontWeight: 400,
              borderRadius: '8px',
              textTransform: 'none',
              boxShadow: 'none',
              whiteSpace: 'nowrap',
              '&:hover': { backgroundColor: '#0077ed', boxShadow: 'none' },
            }}
          >
            {isExpired ? 'Reconnect' : 'Connect'}
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default function SettingsView() {
  const { data: statuses, isLoading: platformsLoading, mutate } = useSWR<PlatformStatusResponse[]>(
    '/api/platforms/status',
    getPlatformStatus,
    { revalidateOnFocus: true }
  )

  const { data: preferences, isLoading: prefsLoading, mutate: mutatePrefs } = useSWR(
    '/api/user/preferences',
    getUserPreferences,
    { revalidateOnFocus: false }
  )

  const [disconnecting, setDisconnecting] = useState<PlatformType | null>(null)
  const [timezone, setTimezone] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const effectiveTimezone = timezone || preferences?.timezone || 'UTC'

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

  async function handleSave() {
    setSaving(true)
    setSaveSuccess(false)
    setSaveError(null)
    try {
      await updateUserPreferences({ timezone: effectiveTimezone })
      await mutatePrefs()
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) {
      const apiErr = toApiError(err)
      setSaveError(apiErr.message ?? 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const connectedCount = statuses?.filter((s) => deriveStatus(s) === 'connected').length ?? 0

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
          Settings
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
          Manage your connected platforms and account preferences.
        </Typography>
      </Box>

      <Grid container spacing={3} alignItems="flex-start">

        <Grid item xs={12} lg={5}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography
                sx={{
                  fontFamily: 'var(--cf-font-display)',
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--th-text-primary)',
                  letterSpacing: '-0.374px',
                }}
              >
                Connected Platforms
              </Typography>
              {!platformsLoading && (
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 12,
                    color: connectedCount > 0 ? '#30d158' : 'var(--th-text-tertiary)',
                    letterSpacing: '-0.12px',
                  }}
                >
                  {connectedCount} / {ALL_PLATFORMS.length} connected
                </Typography>
              )}
            </Box>

            {platformsLoading
              ? ALL_PLATFORMS.map((p) => <PlatformCardSkeleton key={p} />)
              : ALL_PLATFORMS.map((platformType) => {
                  const raw = statusMap.get(platformType) ?? {
                    platform: platformType,
                    connected: false,
                  }
                  return (
                    <PlatformCard
                      key={platformType}
                      platformType={platformType}
                      raw={raw}
                      disconnecting={disconnecting}
                      onConnect={handleConnect}
                      onDisconnect={handleDisconnect}
                    />
                  )
                })}
          </Box>
        </Grid>

        <Grid item xs={12} lg>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography
              sx={{
                fontFamily: 'var(--cf-font-display)',
                fontSize: 17,
                fontWeight: 600,
                color: 'var(--th-text-primary)',
                letterSpacing: '-0.374px',
              }}
            >
              Account
            </Typography>

            <Box sx={cardSx}>
              <Typography sx={sectionHeadSx}>Profile</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Display Name"
                  placeholder="Your creator name"
                  variant="outlined"
                  sx={inputSx}
                />
                <Box>
                  <TextField
                    fullWidth
                    label="Email"
                    variant="outlined"
                    disabled
                    sx={{
                      ...inputSx,
                      '& .MuiOutlinedInput-root': {
                        ...inputSx['& .MuiOutlinedInput-root'],
                        '&.Mui-disabled': {
                          backgroundColor: 'var(--th-bg-surface)',
                          '& fieldset': { borderColor: 'var(--th-border)' },
                        },
                      },
                      '& .MuiInputBase-input.Mui-disabled': {
                        WebkitTextFillColor: 'var(--th-text-tertiary)',
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
                    <LockOutlinedIcon sx={{ fontSize: 11, color: 'var(--th-text-tertiary)' }} />
                    <Typography
                      sx={{
                        fontFamily: 'var(--cf-font-text)',
                        fontSize: 12,
                        color: 'var(--th-text-tertiary)',
                        letterSpacing: '-0.12px',
                      }}
                    >
                      Managed by Keycloak. Change it there if needed.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={cardSx}>
              <Typography sx={sectionHeadSx}>Preferences</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth sx={selectSx}>
                  <InputLabel>Content Niche</InputLabel>
                  <Select
                    label="Content Niche"
                    defaultValue=""
                    MenuProps={{ PaperProps: { sx: menuPaperSx } }}
                  >
                    {CONTENT_NICHES.map((n) => (
                      <MenuItem key={n} value={n}>{n}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth sx={selectSx}>
                  <InputLabel>Timezone</InputLabel>
                  {prefsLoading ? (
                    <Skeleton variant="rounded" height={52} sx={{ borderRadius: '8px' }} />
                  ) : (
                    <Select
                      label="Timezone"
                      value={effectiveTimezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      MenuProps={{ PaperProps: { sx: menuPaperSx } }}
                    >
                      {TIMEZONES.map((tz) => (
                        <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                      ))}
                    </Select>
                  )}
                </FormControl>
              </Box>
            </Box>

            {saveSuccess && (
              <Alert
                severity="success"
                sx={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: 13,
                  backgroundColor: 'rgba(48,209,88,0.1)',
                  color: '#30d158',
                  border: '1px solid rgba(48,209,88,0.3)',
                  borderRadius: '8px',
                  '& .MuiAlert-icon': { color: '#30d158' },
                }}
              >
                Preferences saved.
              </Alert>
            )}

            {saveError && (
              <Alert
                severity="error"
                sx={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: 13,
                  backgroundColor: 'rgba(255,64,64,0.1)',
                  color: '#ff4040',
                  border: '1px solid rgba(255,64,64,0.3)',
                  borderRadius: '8px',
                  '& .MuiAlert-icon': { color: '#ff4040' },
                }}
              >
                {saveError}
              </Alert>
            )}

            <Divider sx={{ borderColor: 'var(--th-border)' }} />

            <Box>
              <Button
                variant="contained"
                disabled={saving}
                onClick={handleSave}
                sx={{
                  backgroundColor: 'var(--cf-blue)',
                  color: '#ffffff',
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: 14,
                  fontWeight: 400,
                  borderRadius: '8px',
                  px: 3,
                  py: 1,
                  textTransform: 'none',
                  boxShadow: 'none',
                  '&:hover': { backgroundColor: '#0077ed', boxShadow: 'none' },
                  '&.Mui-disabled': { opacity: 0.5 },
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
