'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import {
  Box,
  Typography,
  TextField,
  Button,
  Radio,
  FormControlLabel,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import PermMediaOutlinedIcon from '@mui/icons-material/PermMediaOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import TagOutlinedIcon from '@mui/icons-material/TagOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined'
import { ContentStatus, PlatformType, ScheduleContentResponse } from '@/lib/response/scheduler'
import { MediaFile } from '@/lib/response/media'
import { getPlatformStatus, getScheduledContentDetail, getUserPreferences } from '@/service/getService'
import { scheduleContent } from '@/service/postService'
import { updateScheduledContent } from '@/service/putService'
import { deleteScheduledContent } from '@/service/deleteService'
import { toApiError } from '@/service/errorService'
import { toLocalDatetimeLocal, toUtcIso } from '@/lib/timezone/timezoneUtils'
import VaultPickerDialog from './VaultPickerDialog'

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

const cardSx = {
  backgroundColor: 'var(--th-bg-card)',
  border: '1px solid var(--th-border-card)',
  borderRadius: '12px',
  p: 3,
}

const sectionLabelSx = {
  fontFamily: 'var(--cf-font-display)',
  fontSize: 15,
  fontWeight: 600,
  color: 'var(--th-text-primary)',
  letterSpacing: '-0.2px',
  mb: 2,
}

const PLATFORM_LABELS: Record<PlatformType, string> = {
  [PlatformType.YOUTUBE]: 'YouTube',
  [PlatformType.INSTAGRAM]: 'Instagram',
  [PlatformType.TWITTER]: 'Twitter/X',
}

const toneVariants = [
  { label: 'Professional', caption: 'Clear and authoritative' },
  { label: 'Casual', caption: 'Friendly and approachable' },
  { label: 'Witty', caption: 'Clever and engaging' },
]

export default function ComposerView() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // edit mode: editId param means we're editing an existing post
  const editId = searchParams.get('editId')
  const isEditMode = !!editId

  const { data: preferences } = useSWR(
    '/api/user/preferences',
    getUserPreferences,
    { revalidateOnFocus: false }
  )
  const userTimezone = preferences?.timezone ?? 'UTC'

  const dateParam = searchParams.get('date')
  const defaultDateTime = (() => {
    if (!dateParam) return ''
    const d = new Date(dateParam)
    if (isNaN(d.getTime())) return dateParam
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null)
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime)
  const [mediaFileId, setMediaFileId] = useState<string | null>(null)
  const [mediaFileName, setMediaFileName] = useState<string | null>(null)
  const [vaultOpen, setVaultOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<ScheduleContentResponse[] | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [editSuccess, setEditSuccess] = useState(false)
  const [editLoadError, setEditLoadError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(isEditMode)
  const [postStatus, setPostStatus] = useState<ContentStatus | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Fetch and pre-fill data when in edit mode.
  // Re-runs when preferences loads so we can convert scheduledAt to the user's timezone.
  useEffect(() => {
    if (!editId || !preferences) return

    let cancelled = false
    setEditLoading(true)
    setEditLoadError(null)

    getScheduledContentDetail(editId)
      .then((post) => {
        if (cancelled) return
        setTitle(post.title)
        setDescription(post.description ?? '')
        setMediaFileId(post.mediaFileId ?? null)
        setSelectedPlatform((post.platformTargets?.[0] as PlatformType) ?? null)
        setPostStatus(post.status)
        if (post.scheduledAt) {
          setScheduledAt(toLocalDatetimeLocal(post.scheduledAt, userTimezone))
        }
      })
      .catch((err) => {
        if (cancelled) return
        const apiErr = toApiError(err)
        setEditLoadError(apiErr.message ?? 'Failed to load post data')
      })
      .finally(() => {
        if (!cancelled) setEditLoading(false)
      })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, preferences])

  const { data: platformStatuses = [] } = useSWR(
    '/api/platforms/status',
    getPlatformStatus,
    { revalidateOnFocus: false }
  )
  const connectedPlatforms = platformStatuses
    .filter((s) => s.connected && (!s.tokenExpiry || new Date(s.tokenExpiry) > new Date()))
    .map((s) => s.platform as PlatformType)

  function selectPlatform(p: PlatformType) {
    setSelectedPlatform(p)
  }

  function handleMediaSelect(file: MediaFile) {
    setMediaFileId(file.id)
    setMediaFileName(file.originalName)
  }

  async function handleDelete() {
    if (!editId) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteScheduledContent(editId)
      setDeleteDialogOpen(false)
      router.push('/dashboard/calendar')
    } catch (err) {
      const apiErr = toApiError(err)
      setDeleteError(apiErr.message ?? 'Failed to delete post')
      setDeleting(false)
    }
  }

  async function handleSubmit(publishNow: boolean) {
    if (!title.trim()) return
    if (selectedPlatforms.size === 0) return
    setSubmitting(true)
    setSubmitError(null)
    setResults(null)
    setEditSuccess(false)

    try {
      if (isEditMode && editId) {
        const scheduledAtUtc = (!publishNow && scheduledAt)
          ? toUtcIso(scheduledAt, userTimezone)
          : undefined
        await updateScheduledContent(editId, {
          title: title.trim(),
          description: description.trim() || undefined,
          mediaFileId: mediaFileId ?? undefined,
          platformTargets: selectedPlatform ? [selectedPlatform] : [],
          scheduledAt: scheduledAtUtc,
        })
        setEditSuccess(true)
        setTimeout(() => router.push('/dashboard/calendar'), 1500)
      } else {
        const scheduledAtUtc = (!publishNow && scheduledAt)
          ? toUtcIso(scheduledAt, userTimezone)
          : undefined
        const res = await scheduleContent({
          title: title.trim(),
          description: description.trim() || undefined,
          mediaFileId: mediaFileId ?? undefined,
          platformTargets: selectedPlatform ? [selectedPlatform] : [],
          scheduledAt: scheduledAtUtc,
        })
        setResults(res)
        if (res.some((r) => !r.error)) {
          setTimeout(() => router.push('/dashboard/calendar'), 1500)
        }
      }
    } catch (err) {
      const apiErr = toApiError(err)
      setSubmitError(apiErr.message ?? (isEditMode ? 'Failed to update post' : 'Failed to schedule content'))
    } finally {
      setSubmitting(false)
    }
  }

  const preferencesLoaded = preferences !== undefined
  const editReady = !isEditMode || (!editLoading && !editLoadError)
  const isPublished = isEditMode && (postStatus === ContentStatus.PUBLISHED || postStatus === ContentStatus.PUBLISHING)
  const isFailed = isEditMode && postStatus === ContentStatus.FAILED
  const isYouTubeSelected = selectedPlatform === PlatformType.YOUTUBE

  // PUBLISHED/PUBLISHING: read-only, no save. FAILED/SCHEDULED/DRAFT: editable.
  const baseCanSubmit = title.trim().length > 0 && selectedPlatform !== null && !submitting && preferencesLoaded && editReady && !isPublished
  const canSchedule = baseCanSubmit && !isYouTubeSelected
  const canPublishNow = baseCanSubmit
  // Delete allowed in edit mode for any status except PUBLISHING/PUBLISHED
  const canDelete = isEditMode && !isPublished && !deleting && editReady

  if (isEditMode && editLoading) {
    return (
      <Box>
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontFamily: 'var(--cf-font-display)', fontSize: { xs: 24, sm: 28 }, fontWeight: 600, color: 'var(--th-text-primary)', letterSpacing: '-0.28px', lineHeight: 1.14 }}>
            Edit Post
          </Typography>
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, color: 'var(--th-text-secondary)', letterSpacing: '-0.224px', mt: 0.5 }}>
            Loading post data...
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <CircularProgress sx={{ color: 'var(--cf-blue)' }} />
        </Box>
      </Box>
    )
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ fontFamily: 'var(--cf-font-display)', fontSize: { xs: 24, sm: 28 }, fontWeight: 600, color: 'var(--th-text-primary)', letterSpacing: '-0.28px', lineHeight: 1.14 }}>
          {isEditMode ? 'Edit Post' : 'Composer'}
        </Typography>
        <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, color: 'var(--th-text-secondary)', letterSpacing: '-0.224px', mt: 0.5 }}>
          {isEditMode && isFailed ? 'This post failed to publish. Fix any issues and save to retry.' : isEditMode ? 'Update your scheduled post.' : 'Create and schedule your content across platforms.'}
        </Typography>
      </Box>

      {editLoadError && (
        <Alert severity="error" sx={{ mb: 3, fontFamily: 'var(--cf-font-text)', fontSize: 13, backgroundColor: 'rgba(255,64,64,0.1)', color: '#ff4040', border: '1px solid rgba(255,64,64,0.3)', borderRadius: '8px', '& .MuiAlert-icon': { color: '#ff4040' } }}>
          {editLoadError}
        </Alert>
      )}


      {isPublished && (
        <Box sx={{ mb: 3, p: 1.5, borderRadius: '8px', backgroundColor: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.25)', display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16, color: '#34c759', flexShrink: 0 }} />
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: '#34c759' }}>
            This post has already been published and cannot be edited.
          </Typography>
        </Box>
      )}

      {isFailed && (
        <Box sx={{ mb: 3, p: 1.5, borderRadius: '8px', backgroundColor: 'rgba(255,64,64,0.08)', border: '1px solid rgba(255,64,64,0.3)', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorOutlineOutlinedIcon sx={{ fontSize: 16, color: '#ff4040', flexShrink: 0 }} />
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: '#ff4040' }}>
            Publishing failed. Update the details below and save to retry — the scheduler will pick it up automatically.
          </Typography>
        </Box>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' }, gap: 3, alignItems: 'start' }}>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={cardSx}>
            <Typography sx={sectionLabelSx}>Content</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField fullWidth label="Title" variant="outlined" value={title} onChange={(e) => setTitle(e.target.value)} sx={inputSx} />
              <TextField fullWidth label="Description" variant="outlined" multiline rows={5} value={description} onChange={(e) => setDescription(e.target.value)} sx={inputSx} />
            </Box>
          </Box>

          <Box sx={cardSx}>
            <Typography sx={sectionLabelSx}>Media</Typography>
            <Box
              onClick={() => setVaultOpen(true)}
              sx={{
                border: '2px dashed var(--th-border)',
                borderRadius: '10px',
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.5,
                cursor: 'pointer',
                '&:hover': { borderColor: 'var(--cf-blue)', backgroundColor: 'rgba(0,113,227,0.04)' },
                transition: 'border-color 0.15s, background-color 0.15s',
                borderColor: mediaFileId ? 'var(--cf-blue)' : 'var(--th-border)',
              }}
            >
              <PermMediaOutlinedIcon sx={{ fontSize: 36, color: mediaFileId ? 'var(--cf-blue)' : 'var(--th-text-tertiary)' }} />
              <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, color: mediaFileId ? 'var(--cf-blue)' : 'var(--th-text-secondary)', letterSpacing: '-0.224px', fontWeight: mediaFileId ? 500 : 400 }}>
                {mediaFileName ?? (mediaFileId ? 'Media attached' : 'Pick from Vault or upload new media')}
              </Typography>
              <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px' }}>
                {mediaFileId ? 'Click to change' : 'MP4, MOV, JPG, PNG — max 500 MB'}
              </Typography>
            </Box>
            <VaultPickerDialog open={vaultOpen} onClose={() => setVaultOpen(false)} onSelect={handleMediaSelect} />
          </Box>

          <Box sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AutoAwesomeOutlinedIcon sx={{ fontSize: 18, color: 'var(--cf-blue)' }} />
              <Typography sx={sectionLabelSx}>AI Suggested Captions</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {toneVariants.map((v) => (
                <Box key={v.label} sx={{ border: '1px solid var(--th-border)', borderRadius: '8px', p: 2, cursor: 'pointer', '&:hover': { borderColor: 'var(--cf-blue)', backgroundColor: 'rgba(0,113,227,0.04)' }, transition: 'border-color 0.15s, background-color 0.15s' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip label={v.label} size="small" sx={{ backgroundColor: 'rgba(0,113,227,0.12)', color: 'var(--cf-blue)', fontFamily: 'var(--cf-font-text)', fontSize: 11, fontWeight: 600, height: 20 }} />
                    <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px' }}>{v.caption}</Typography>
                  </Box>
                  <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: 'var(--th-text-secondary)', letterSpacing: '-0.12px', lineHeight: 1.47 }}>
                    Caption will appear here once content is added above...
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TagOutlinedIcon sx={{ fontSize: 18, color: 'var(--cf-blue)' }} />
              <Typography sx={sectionLabelSx}>AI Hashtag Suggestions</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {['#content', '#creator', '#socialmedia'].map((tag) => (
                <Chip key={tag} label={tag} size="small" sx={{ backgroundColor: 'var(--th-bg-surface)', color: 'var(--th-text-secondary)', fontFamily: 'var(--cf-font-text)', fontSize: 12, border: '1px solid var(--th-border)', opacity: 0.5 }} />
              ))}
              <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px', alignSelf: 'center' }}>
                Suggestions load once content is added.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={cardSx}>
            <Typography sx={sectionLabelSx}>Platforms</Typography>
            {connectedPlatforms.length === 0 ? (
              <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: 'var(--th-text-tertiary)' }}>
                No connected platforms. Visit{' '}
                <Box component="a" href="/dashboard/platforms" sx={{ color: 'var(--cf-blue)', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                  Platforms
                </Box>{' '}
                to connect.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {connectedPlatforms.map((p) => (
                  <FormControlLabel
                    key={p}
                    control={
                      <Radio
                        checked={selectedPlatform === p}
                        onChange={() => selectPlatform(p)}
                        sx={{ color: 'var(--th-text-tertiary)', '&.Mui-checked': { color: 'var(--cf-blue)' } }}
                      />
                    }
                    label={<Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, color: 'var(--th-text-secondary)', letterSpacing: '-0.224px' }}>{PLATFORM_LABELS[p]}</Typography>}
                  />
                ))}
                {isEditMode && selectedPlatform && !connectedPlatforms.includes(selectedPlatform) && (
                  <FormControlLabel
                    key={selectedPlatform}
                    control={<Radio checked disabled sx={{ color: 'var(--th-text-tertiary)', '&.Mui-checked': { color: 'var(--th-text-tertiary)' } }} />}
                    label={
                      <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, color: 'var(--th-text-tertiary)', letterSpacing: '-0.224px' }}>
                        {PLATFORM_LABELS[selectedPlatform] ?? selectedPlatform} (disconnected)
                      </Typography>
                    }
                  />
                )}
              </Box>
            )}
            {isYouTubeSelected && (
              <Alert
                severity="warning"
                sx={{
                  mt: 2,
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: 13,
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255,179,0,0.08)',
                  color: '#ffb300',
                  border: '1px solid rgba(255,179,0,0.3)',
                  '& .MuiAlert-icon': { color: '#ffb300' },
                  '& .MuiAlert-message': { lineHeight: 1.55 },
                }}
              >
                <strong>YouTube works differently.</strong> We don&apos;t publish directly to YouTube — you upload and go live in YouTube Studio yourself. Use the &quot;YouTube Video Live Time&quot; field below to tell us when your video went live (or will go live). We&apos;ll start pulling your analytics 72 hours after that time, when YouTube&apos;s data becomes accurate. <strong>Schedule Post is not available for YouTube</strong> — click <strong>Confirm Live Time</strong> once you&apos;ve set the date.
              </Alert>
            )}
            <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px', mt: 1.5 }}>
              Only connected platforms are shown.
            </Typography>
          </Box>

          <Box sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ScheduleOutlinedIcon sx={{ fontSize: 18, color: isYouTubeSelected ? '#ffb300' : 'var(--cf-blue)' }} />
              <Typography sx={{ ...sectionLabelSx, mb: 0 }}>
                {isYouTubeSelected ? 'YouTube Video Live Time' : 'Schedule'}
              </Typography>
            </Box>
            <TextField
              type="datetime-local"
              fullWidth
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              sx={inputSx}
              InputLabelProps={{ shrink: true }}
            />
            {isYouTubeSelected ? (
              <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 11, color: '#ffb300', letterSpacing: '-0.08px', mt: 0.75, lineHeight: 1.5 }}>
                Enter when your video went live (or will go live) on YouTube Studio. Analytics tracking starts 72 hours after this time.
              </Typography>
            ) : preferences?.timezone && preferences.timezone !== 'UTC' ? (
              <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 11, color: 'var(--th-text-tertiary)', letterSpacing: '-0.08px', mt: 0.75 }}>
                Times are in {preferences.timezone}
              </Typography>
            ) : null}
          </Box>

          {editSuccess && (
            <Box sx={{ p: 1.5, borderRadius: '8px', backgroundColor: 'rgba(52,199,89,0.08)', border: '1px solid rgba(52,199,89,0.25)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16, color: '#34c759', flexShrink: 0 }} />
              <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: '#34c759' }}>
                Post updated — returning to calendar...
              </Typography>
            </Box>
          )}

          {results && results.length > 0 && (
            <Box sx={cardSx}>
              <Typography sx={{ ...sectionLabelSx, mb: 1.5 }}>Result</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {results.map((r) => (
                  <Box key={r.platform} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '8px', backgroundColor: r.error ? 'rgba(255,64,64,0.08)' : 'rgba(52,199,89,0.08)', border: `1px solid ${r.error ? 'rgba(255,64,64,0.25)' : 'rgba(52,199,89,0.25)'}` }}>
                    {r.error
                      ? <ErrorOutlineOutlinedIcon sx={{ fontSize: 16, color: '#ff4040', flexShrink: 0 }} />
                      : <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16, color: '#34c759', flexShrink: 0 }} />
                    }
                    <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: r.error ? '#ff4040' : '#34c759', flex: 1 }}>
                      {PLATFORM_LABELS[r.platform as PlatformType] ?? r.platform}
                      {r.error ? ` — ${r.error}` : ' — Scheduled'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {submitError && (
            <Alert severity="error" sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, backgroundColor: 'rgba(255,64,64,0.1)', color: '#ff4040', border: '1px solid rgba(255,64,64,0.3)', borderRadius: '8px', '& .MuiAlert-icon': { color: '#ff4040' } }}>
              {submitError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Schedule Post — hidden when YouTube is selected (YouTube has no schedule flow) */}
            {!isYouTubeSelected && (
              <Button
                variant="contained"
                fullWidth
                disabled={!canSchedule}
                onClick={() => handleSubmit(false)}
                sx={{ backgroundColor: 'var(--cf-blue)', color: '#ffffff', fontFamily: 'var(--cf-font-text)', fontSize: 14, fontWeight: 400, borderRadius: '8px', py: 1.25, textTransform: 'none', boxShadow: 'none', '&:hover': { backgroundColor: '#0077ed', boxShadow: 'none' }, '&.Mui-disabled': { backgroundColor: 'rgba(0,113,227,0.4)', color: 'rgba(255,255,255,0.6)' } }}
              >
                {submitting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : isEditMode ? 'Save Changes' : 'Schedule Post'}
              </Button>
            )}

            {/* YouTube primary action — "Confirm Live Time" replaces both buttons */}
            {isYouTubeSelected && (
              <Button
                variant="contained"
                fullWidth
                disabled={!canPublishNow}
                onClick={() => handleSubmit(true)}
                sx={{ backgroundColor: '#ffb300', color: '#000', fontFamily: 'var(--cf-font-text)', fontSize: 14, fontWeight: 500, borderRadius: '8px', py: 1.25, textTransform: 'none', boxShadow: 'none', '&:hover': { backgroundColor: '#e6a200', boxShadow: 'none' }, '&.Mui-disabled': { backgroundColor: 'rgba(255,179,0,0.35)', color: 'rgba(0,0,0,0.4)' } }}
              >
                {submitting ? <CircularProgress size={16} sx={{ color: '#000' }} /> : 'Confirm Live Time'}
              </Button>
            )}

            {/* Publish Now — non-YouTube, create mode only */}
            {!isEditMode && !isYouTubeSelected && (
              <Button
                variant="outlined"
                fullWidth
                disabled={!canPublishNow}
                onClick={() => handleSubmit(true)}
                sx={{ borderColor: 'var(--th-border)', color: 'var(--th-text-secondary)', fontFamily: 'var(--cf-font-text)', fontSize: 14, fontWeight: 400, borderRadius: '8px', py: 1.25, textTransform: 'none', '&:hover': { borderColor: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-surface)' }, '&.Mui-disabled': { borderColor: 'var(--th-border)', color: 'var(--th-text-tertiary)' } }}
              >
                Publish Now
              </Button>
            )}
            {isEditMode && (
              <Button
                variant="outlined"
                fullWidth
                disabled={!canDelete}
                onClick={() => { setDeleteError(null); setDeleteDialogOpen(true) }}
                startIcon={<DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
                sx={{ borderColor: 'rgba(255,64,64,0.4)', color: '#ff4040', fontFamily: 'var(--cf-font-text)', fontSize: 14, fontWeight: 400, borderRadius: '8px', py: 1.25, textTransform: 'none', '&:hover': { borderColor: '#ff4040', backgroundColor: 'rgba(255,64,64,0.06)' }, '&.Mui-disabled': { borderColor: 'rgba(255,64,64,0.2)', color: 'rgba(255,64,64,0.4)' } }}
              >
                Delete Post
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--th-bg-card)',
            border: '1px solid var(--th-border-card)',
            borderRadius: '12px',
            color: 'var(--th-text-primary)',
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--cf-font-display)', fontSize: 17, fontWeight: 600, color: 'var(--th-text-primary)', letterSpacing: '-0.2px' }}>
          Delete post?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, color: 'var(--th-text-secondary)', letterSpacing: '-0.224px' }}>
            This will permanently delete the post and cannot be undone.
          </DialogContentText>
          {deleteError && (
            <Alert severity="error" sx={{ mt: 2, fontFamily: 'var(--cf-font-text)', fontSize: 13, backgroundColor: 'rgba(255,64,64,0.1)', color: '#ff4040', border: '1px solid rgba(255,64,64,0.3)', borderRadius: '8px', '& .MuiAlert-icon': { color: '#ff4040' } }}>
              {deleteError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, color: 'var(--th-text-secondary)', textTransform: 'none', borderRadius: '8px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            variant="contained"
            sx={{ backgroundColor: '#ff4040', color: '#fff', fontFamily: 'var(--cf-font-text)', fontSize: 14, fontWeight: 400, textTransform: 'none', borderRadius: '8px', boxShadow: 'none', '&:hover': { backgroundColor: '#e03030', boxShadow: 'none' }, '&.Mui-disabled': { backgroundColor: 'rgba(255,64,64,0.4)', color: 'rgba(255,255,255,0.6)' } }}
          >
            {deleting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
