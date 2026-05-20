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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
import { checkDisconnect, getNiches, getPlatformStatus, getTimezones, getUserPreferences } from '@/service/getService'
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
  checking: PlatformType | null
  onConnect: (p: PlatformType) => void
  onDisconnect: (p: PlatformType) => void
}

function PlatformCard({ platformType, raw, disconnecting, checking, onConnect, onDisconnect }: PlatformCardProps) {
  const status = deriveStatus(raw)
  const { label, chipSx } = statusConfig[status]
  const isConnected = status === 'connected'
  const isExpired = status === 'expired'
  const meta = PLATFORM_META[platformType]
  const isDisconnecting = disconnecting === platformType
  const isChecking = checking === platformType

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
            disabled={isDisconnecting || isChecking}
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
            {isChecking ? 'Checking…' : isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
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

  const { data: nichesData, isLoading: nichesLoading } = useSWR(
    '/api/user/niches',
    getNiches,
    { revalidateOnFocus: false }
  )

  const { data: timezonesData, isLoading: timezonesLoading } = useSWR(
    '/api/user/timezones',
    getTimezones,
    { revalidateOnFocus: false }
  )

  const [disconnecting, setDisconnecting] = useState<PlatformType | null>(null)
  const [checking, setChecking] = useState<PlatformType | null>(null)

  // Confirmation dialog state
  const [confirmPlatform, setConfirmPlatform] = useState<PlatformType | null>(null)
  const [scheduledCount, setScheduledCount] = useState(0)

  const [timezone, setTimezone] = useState<string>('')
  const [displayName, setDisplayName] = useState<string>('')
  const [niche, setNiche] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Derive effective values: local state takes priority, fall back to loaded preferences
  const effectiveTimezone = timezone || preferences?.timezone || 'UTC'
  const effectiveDisplayName = displayName !== '' ? displayName : (preferences?.displayName ?? '')
  const effectiveNiche = niche !== '' ? niche : (preferences?.niche ?? '')
  const niches = nichesData?.niches ?? []
  const timezones = timezonesData?.timezones ?? []

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
  async function handleDisconnect(platform: PlatformType) {
    setChecking(platform)
    try {
      const { scheduledCount: count } = await checkDisconnect(platform.toLowerCase())
      if (count > 0) {
        setScheduledCount(count)
        setConfirmPlatform(platform)
      } else {
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
    if (confirmPlatform) executeDisconnect(confirmPlatform)
  }

  function handleCancelDisconnect() {
    setConfirmPlatform(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveSuccess(false)
    setSaveError(null)
    try {
      await updateUserPreferences({
        timezone: effectiveTimezone,
        displayName: effectiveDisplayName || null,
        niche: effectiveNiche || null,
      })
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
                      checking={checking}
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

                {/* Display Name — editable, takes priority over Keycloak name in sidebar */}
                {prefsLoading ? (
                  <Skeleton variant="rounded" height={52} sx={{ borderRadius: '8px' }} />
                ) : (
                  <TextField
                    fullWidth
                    label="Display Name"
                    placeholder="Your creator name"
                    variant="outlined"
                    value={effectiveDisplayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    sx={inputSx}
                  />
                )}

                {/* Email — read-only, sourced from identity provider */}
                <Box>
                  {prefsLoading ? (
                    <Skeleton variant="rounded" height={52} sx={{ borderRadius: '8px' }} />
                  ) : (
                    <TextField
                      fullWidth
                      label="Email"
                      variant="outlined"
                      value={preferences?.email ?? ''}
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
                  )}
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
                      Your email is managed by your identity provider and cannot be changed here.
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
                  {nichesLoading || prefsLoading ? (
                    <Skeleton variant="rounded" height={52} sx={{ borderRadius: '8px' }} />
                  ) : (
                    <Select
                      label="Content Niche"
                      value={effectiveNiche}
                      onChange={(e) => setNiche(e.target.value)}
                      MenuProps={{ PaperProps: { sx: menuPaperSx } }}
                    >
                      <MenuItem value=""><em>None</em></MenuItem>
                      {niches.map((n) => (
                        <MenuItem key={n} value={n}>{n}</MenuItem>
                      ))}
                    </Select>
                  )}
                </FormControl>

                <FormControl fullWidth sx={selectSx}>
                  <InputLabel>Timezone</InputLabel>
                  {prefsLoading || timezonesLoading ? (
                    <Skeleton variant="rounded" height={52} sx={{ borderRadius: '8px' }} />
                  ) : (
                    <Select
                      label="Timezone"
                      value={effectiveTimezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      MenuProps={{ PaperProps: { sx: menuPaperSx } }}
                    >
                      {timezones.map((tz) => (
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
              '&.Mui-disabled': { opacity: 0.5 },
            }}
          >
            {disconnecting !== null ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
