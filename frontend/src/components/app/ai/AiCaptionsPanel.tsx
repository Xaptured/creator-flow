'use client'

import { useState } from 'react'
import { Box, Button, Chip, CircularProgress, Skeleton, Typography } from '@mui/material'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import { generateCaptions } from '@/service/postService'
import { CaptionVariant } from '@/lib/response/ai'
import { toApiError } from '@/service/errorService'

const TONE_LABELS: Record<string, string> = {
  professional: 'Professional',
  casual: 'Casual',
  hype: 'Hype',
  informative: 'Informative',
}

const TONE_DESCRIPTIONS: Record<string, string> = {
  professional: 'Clear and authoritative',
  casual: 'Friendly and approachable',
  hype: 'Bold and energetic',
  informative: 'Educational and clear',
}

interface Props {
  title: string
  platform: string
  niche: string
  onSelect: (caption: string) => void
}

export default function AiCaptionsPanel({ title, platform, niche, onSelect }: Props) {
  const [captions, setCaptions] = useState<CaptionVariant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const canGenerate = title.trim().length > 0 && platform.length > 0

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    setCaptions([]) 
    try {
      const res = await generateCaptions({ title, platform, niche: niche || 'general' })
      setCaptions(res.captions)
    } catch (err) {
      const apiErr = toApiError(err)
      setError(apiErr.message ?? 'Failed to generate captions')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(caption: string, tone: string) {
    await navigator.clipboard.writeText(caption)
    setCopied(tone)
    setTimeout(() => setCopied(null), 1500)
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeOutlinedIcon sx={{ fontSize: 18, color: 'var(--cf-blue)' }} />
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-display)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--th-text-primary)',
              letterSpacing: '-0.2px',
            }}
          >
            AI Suggested Captions
          </Typography>
        </Box>
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
          {loading ? 'Generating...' : captions.length > 0 ? 'Regenerate' : 'Generate'}
        </Button>
      </Box>

      <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px', mb: 2, mt: -1, lineHeight: 1.5 }}>
        Four tone variants written from your title — tap one to use it as your description.
      </Typography>

      {loading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {[0, 1, 2, 3].map((i) => (
            <Box key={i} sx={{ border: '1px solid var(--th-border)', borderRadius: '8px', p: 2 }}>
              <Skeleton variant="rounded" width={90} height={20} sx={{ bgcolor: 'var(--th-border)', mb: 1 }} />
              <Skeleton variant="text" width="100%" sx={{ bgcolor: 'var(--th-border)' }} />
              <Skeleton variant="text" width="80%" sx={{ bgcolor: 'var(--th-border)' }} />
            </Box>
          ))}
        </Box>
      )}

      {error && (
        <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: '#ff4040', mb: 1.5 }}>
          {error}
        </Typography>
      )}

      {!canGenerate && captions.length === 0 && (
        <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px' }}>
          Add a title and select a platform to generate captions.
        </Typography>
      )}

      {captions.length === 0 && canGenerate && !loading && !error && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {(['professional', 'casual', 'hype', 'informative'] as const).map((tone) => (
            <Box
              key={tone}
              sx={{
                border: '1px solid var(--th-border)',
                borderRadius: '8px',
                p: 2,
                opacity: 0.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Chip label={TONE_LABELS[tone]} size="small" sx={{ backgroundColor: 'rgba(0,113,227,0.12)', color: 'var(--cf-blue)', fontFamily: 'var(--cf-font-text)', fontSize: 11, fontWeight: 600, height: 20 }} />
                <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px' }}>{TONE_DESCRIPTIONS[tone]}</Typography>
              </Box>
              <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px', lineHeight: 1.47 }}>
                Click Generate above to create captions...
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {captions.length > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {captions.map((v) => (
            <Box
              key={v.tone}
              sx={{
                border: '1px solid var(--th-border)',
                borderRadius: '8px',
                p: 2,
                cursor: 'pointer',
                transition: 'border-color 0.15s, background-color 0.15s',
                '&:hover': { borderColor: 'var(--cf-blue)', backgroundColor: 'rgba(0,113,227,0.04)' },
              }}
              onClick={() => onSelect(v.caption)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={TONE_LABELS[v.tone]} size="small" sx={{ backgroundColor: 'rgba(0,113,227,0.12)', color: 'var(--cf-blue)', fontFamily: 'var(--cf-font-text)', fontSize: 11, fontWeight: 600, height: 20 }} />
                  <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 12, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px' }}>
                    {TONE_DESCRIPTIONS[v.tone]}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleCopy(v.caption, v.tone) }}
                  startIcon={<ContentCopyOutlinedIcon sx={{ fontSize: 12 }} />}
                  sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 11, color: copied === v.tone ? '#34c759' : 'var(--th-text-tertiary)', textTransform: 'none', minWidth: 0, px: 1 }}
                >
                  {copied === v.tone ? 'Copied' : 'Copy'}
                </Button>
              </Box>
              <Typography
                sx={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: 13,
                  color: 'var(--th-text-secondary)',
                  letterSpacing: '-0.12px',
                  lineHeight: 1.47,
                }}
              >
                {v.caption}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
