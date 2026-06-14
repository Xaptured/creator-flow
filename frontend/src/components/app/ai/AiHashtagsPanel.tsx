'use client'

import { useState } from 'react'
import { Box, Button, Chip, CircularProgress, Skeleton, Typography } from '@mui/material'
import TagOutlinedIcon from '@mui/icons-material/TagOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import { generateHashtags } from '@/service/postService'
import { HashtagItem, VolumeCategory } from '@/lib/response/ai'
import { toApiError } from '@/service/errorService'

const VOLUME_COLORS: Record<VolumeCategory, { bg: string; text: string }> = {
  high: { bg: 'rgba(52,199,89,0.12)', text: '#34c759' },
  mid: { bg: 'rgba(0,113,227,0.12)', text: 'var(--cf-blue)' },
  niche: { bg: 'rgba(255,159,10,0.12)', text: '#ff9f0a' },
}

const VOLUME_LABELS: Record<VolumeCategory, string> = {
  high: 'High',
  mid: 'Mid',
  niche: 'Niche',
}

interface Props {
  description: string
  platform: string
}

export default function AiHashtagsPanel({ description, platform }: Props) {
  const [hashtags, setHashtags] = useState<HashtagItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const canGenerate = description.trim().length > 0 && platform.length > 0

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setHashtags([])
    try {
      const res = await generateHashtags({ description, platform })
      setHashtags(res.hashtags)
    } catch (err) {
      const apiErr = toApiError(err)
      setError(apiErr.message ?? 'Failed to generate hashtags')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyAll() {
    const text = hashtags.map((h) => h.hashtag).join(' ')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TagOutlinedIcon sx={{ fontSize: 18, color: 'var(--cf-blue)' }} />
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-display)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--th-text-primary)',
              letterSpacing: '-0.2px',
            }}
          >
            AI Hashtag Suggestions
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {hashtags.length > 0 && (
            <Button
              size="small"
              onClick={handleCopyAll}
              sx={{
                fontFamily: 'var(--cf-font-text)',
                fontSize: 12,
                color: copied ? '#34c759' : 'var(--th-text-tertiary)',
                textTransform: 'none',
                px: 1.5,
                borderRadius: '6px',
                border: '1px solid var(--th-border)',
                '&:hover': { backgroundColor: 'var(--th-bg-surface)' },
              }}
            >
              {copied ? 'Copied!' : 'Copy all'}
            </Button>
          )}
          <Button
            size="small"
            disabled={!canGenerate || loading}
            onClick={handleGenerate}
            startIcon={loading ? <CircularProgress size={12} sx={{ color: 'var(--cf-blue)' }} /> : <AutoAwesomeOutlinedIcon sx={{ fontSize: 14 }} />}
            sx={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: 12,
              color: 'var(--cf-blue)',
              textTransform: 'none',
              px: 1.5,
              borderRadius: '6px',
              border: '1px solid rgba(0,113,227,0.3)',
              '&:hover': { backgroundColor: 'rgba(0,113,227,0.06)' },
              '&.Mui-disabled': { opacity: 0.4 },
            }}
          >
            {loading ? 'Generating...' : hashtags.length > 0 ? 'Regenerate' : 'Generate'}
          </Button>
        </Box>
      </Box>

      <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px', mb: 2, mt: -1, lineHeight: 1.5 }}>
        15 tags ranked by reach (high / mid / niche) — tap any tag to copy it.
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {Array.from({ length: 15 }).map((_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              width={70 + (i % 4) * 18}
              height={28}
              sx={{ bgcolor: 'var(--th-border)', borderRadius: '6px' }}
            />
          ))}
        </Box>
      )}

      {error && (
        <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: '#ff4040', mb: 1.5 }}>
          {error}
        </Typography>
      )}

      {!canGenerate && hashtags.length === 0 && (
        <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px' }}>
          Add a description and select a platform to generate hashtags.
        </Typography>
      )}

      {canGenerate && hashtags.length === 0 && !loading && !error && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {['#content', '#creator', '#socialmedia', '#reels', '#trending'].map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{ backgroundColor: 'var(--th-bg-surface)', color: 'var(--th-text-tertiary)', fontFamily: 'var(--cf-font-text)', fontSize: 12, border: '1px solid var(--th-border)', opacity: 0.5 }}
            />
          ))}
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px', alignSelf: 'center' }}>
            Click Generate to load real suggestions.
          </Typography>
        </Box>
      )}

      {hashtags.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {hashtags.map((h) => {
              const colors = VOLUME_COLORS[h.volumeCategory] ?? VOLUME_COLORS.mid
              return (
                <Box
                  key={h.hashtag}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: '6px',
                    backgroundColor: 'var(--th-bg-surface)',
                    border: '1px solid var(--th-border)',
                    cursor: 'pointer',
                    transition: 'border-color 0.12s',
                    '&:hover': { borderColor: 'var(--cf-blue)' },
                  }}
                  onClick={() => navigator.clipboard.writeText(h.hashtag)}
                >
                  <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--th-text-primary)', letterSpacing: '-0.12px' }}>
                    {h.hashtag}
                  </Typography>
                  <Chip
                    label={VOLUME_LABELS[h.volumeCategory]}
                    size="small"
                    sx={{ backgroundColor: colors.bg, color: colors.text, fontFamily: 'var(--cf-font-text)', fontSize: 10, fontWeight: 600, height: 16, '& .MuiChip-label': { px: 0.75 } }}
                  />
                </Box>
              )
            })}
          </Box>
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 11, color: 'var(--th-text-tertiary)', letterSpacing: '-0.08px', mt: 1.5 }}>
            Click any hashtag to copy it. Green = high volume · Blue = mid · Orange = niche.
          </Typography>
        </Box>
      )}
    </Box>
  )
}
