'use client'

import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Divider,
  Grid,
  Chip,
} from '@mui/material'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'

interface PostAnalyticsDetailProps {
  postId: string | null
  onClose: () => void
}

const metrics = [
  { label: 'Views', value: '—' },
  { label: 'Likes', value: '—' },
  { label: 'Comments', value: '—' },
  { label: 'Engagement Rate', value: '—' },
  { label: 'Watch Time', value: '—' },
  { label: 'Shares', value: '—' },
]

const commentDigest = [
  'What editing software do you use?',
  'Could you do a tutorial on this?',
  'This was incredibly helpful, thanks!',
  'When is the next one coming?',
  'Please share the resources from this video.',
]

export default function PostAnalyticsDetail({ postId, onClose }: PostAnalyticsDetailProps) {
  const open = !!postId

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'var(--th-bg-card)',
          border: '1px solid var(--th-border-card)',
          borderRadius: '16px',
          boxShadow: 'rgba(0,0,0,0.5) 0 20px 60px 0',
        },
      }}
      slotProps={{
        backdrop: {
          sx: { backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.6)' },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          px: 3,
          pt: 2.5,
        }}
      >
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-display)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--th-text-primary)',
            letterSpacing: '-0.374px',
          }}
        >
          Post Analytics
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'var(--th-text-tertiary)',
            '&:hover': { backgroundColor: 'var(--th-bg-surface)', color: 'var(--th-text-primary)' },
          }}
        >
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3 }}>
        <Box
          sx={{
            height: 160,
            borderRadius: '10px',
            backgroundColor: 'var(--th-bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: 13,
              color: 'var(--th-text-tertiary)',
              letterSpacing: '-0.12px',
            }}
          >
            Thumbnail preview
          </Typography>
        </Box>

        <Typography
          sx={{
            fontFamily: 'var(--cf-font-display)',
            fontSize: 21,
            fontWeight: 600,
            color: 'var(--th-text-primary)',
            letterSpacing: '-0.28px',
            lineHeight: 1.19,
            mb: 0.5,
          }}
        >
          Post title goes here
        </Typography>
        <Chip
          label="YouTube"
          size="small"
          sx={{
            backgroundColor: 'rgba(255,0,0,0.12)',
            color: '#ff4040',
            fontFamily: 'var(--cf-font-text)',
            fontSize: 11,
            fontWeight: 600,
            height: 20,
            mb: 3,
          }}
        />

        <Grid container spacing={1.5} sx={{ mb: 3 }}>
          {metrics.map(m => (
            <Grid item xs={6} sm={4} key={m.label}>
              <Box
                sx={{
                  backgroundColor: 'var(--th-bg-surface)',
                  borderRadius: '8px',
                  p: 1.5,
                  textAlign: 'center',
                }}
              >
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--th-text-tertiary)',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                    mb: 0.5,
                  }}
                >
                  {m.label}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-display)',
                    fontSize: 20,
                    fontWeight: 600,
                    color: 'var(--th-text-primary)',
                    letterSpacing: '-0.28px',
                    lineHeight: 1.1,
                  }}
                >
                  {m.value}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ borderColor: 'var(--th-border)', mb: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <ChatBubbleOutlineOutlinedIcon sx={{ fontSize: 16, color: 'var(--cf-blue)' }} />
            <Typography
              sx={{
                fontFamily: 'var(--cf-font-display)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--th-text-primary)',
                letterSpacing: '-0.224px',
              }}
            >
              Top Questions from Audience
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {commentDigest.map((q, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--th-text-tertiary)',
                    width: 16,
                    flexShrink: 0,
                    mt: '1px',
                  }}
                >
                  {i + 1}.
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 13,
                    color: 'var(--th-text-secondary)',
                    letterSpacing: '-0.12px',
                    lineHeight: 1.47,
                  }}
                >
                  {q}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'var(--th-border)', mb: 3 }} />

        <Box
          sx={{
            backgroundColor: 'rgba(0,113,227,0.08)',
            border: '1px solid rgba(0,113,227,0.2)',
            borderRadius: '10px',
            p: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AutoAwesomeOutlinedIcon sx={{ fontSize: 15, color: 'var(--cf-blue)' }} />
            <Typography
              sx={{
                fontFamily: 'var(--cf-font-display)',
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--cf-blue)',
                letterSpacing: '-0.12px',
              }}
            >
              AI Follow-up Idea
            </Typography>
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
            {/* TODO: replace with real AI suggestion */}
            Based on top questions, your audience wants a detailed tutorial. Consider creating a step-by-step follow-up.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
