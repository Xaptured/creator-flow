'use client'

import { Box, Typography, Grid, Chip } from '@mui/material'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'

const cardSx = {
  backgroundColor: 'var(--th-bg-card)',
  border: '1px solid var(--th-border-card)',
  borderRadius: '12px',
  p: 3,
  boxShadow: 'var(--cf-card-shadow)',
}

const statCards = [
  { label: 'Total Views', value: '—', delta: '+0%', platform: 'All Platforms' },
  { label: 'Likes', value: '—', delta: '+0%', platform: 'All Platforms' },
  { label: 'Comments', value: '—', delta: '+0%', platform: 'All Platforms' },
  { label: 'Scheduled Posts', value: '—', delta: 'This week', platform: 'Upcoming' },
]

const aiInsights = [
  'Your best posting time is Tuesday at 6 PM — data coming soon.',
  'Engagement rate trend will appear once platforms are connected.',
  'Caption suggestions powered by Claude AI will surface here.',
]

const contentGaps = [
  "You haven't posted in 30+ days — connect a platform to track gaps.",
]

export default function DashboardHome() {
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
          Dashboard
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
          Overview of your content performance across all platforms.
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statCards.map((stat) => (
          <Grid item xs={12} sm={6} xl={3} key={stat.label}>
            <Box sx={cardSx}>
              <Typography
                sx={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--th-text-tertiary)',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  mb: 1,
                }}
              >
                {stat.label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'var(--cf-font-display)',
                  fontSize: 32,
                  fontWeight: 600,
                  color: 'var(--th-text-primary)',
                  letterSpacing: '-0.28px',
                  lineHeight: 1.1,
                  mb: 1,
                }}
              >
                {stat.value}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpOutlinedIcon sx={{ fontSize: 14, color: 'var(--th-text-tertiary)' }} />
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 12,
                    color: 'var(--th-text-tertiary)',
                    letterSpacing: '-0.12px',
                  }}
                >
                  {stat.delta} · {stat.platform}
                </Typography>
              </Box>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <Box sx={cardSx}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
              <AutoAwesomeOutlinedIcon sx={{ fontSize: 18, color: 'var(--cf-blue)' }} />
              <Typography
                sx={{
                  fontFamily: 'var(--cf-font-display)',
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--th-text-primary)',
                  letterSpacing: '-0.374px',
                }}
              >
                AI Insights
              </Typography>
              <Chip
                label="Top 3"
                size="small"
                sx={{
                  backgroundColor: 'rgba(0, 113, 227, 0.15)',
                  color: 'var(--cf-blue)',
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: 11,
                  fontWeight: 600,
                  height: 20,
                }}
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {aiInsights.map((tip, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: 'var(--cf-blue)',
                      mt: '7px',
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: 'var(--cf-font-text)',
                      fontSize: 14,
                      color: 'var(--th-text-secondary)',
                      letterSpacing: '-0.224px',
                      lineHeight: 1.47,
                    }}
                  >
                    {tip}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Box sx={{ ...cardSx, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ScheduleOutlinedIcon sx={{ fontSize: 18, color: 'var(--cf-blue)' }} />
              <Typography
                sx={{
                  fontFamily: 'var(--cf-font-display)',
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--th-text-primary)',
                  letterSpacing: '-0.374px',
                }}
              >
                Best Time to Post
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: 'var(--cf-font-display)',
                fontSize: 24,
                fontWeight: 600,
                color: 'var(--th-text-primary)',
                letterSpacing: '-0.28px',
                mb: 0.5,
              }}
            >
              —
            </Typography>
            <Typography
              sx={{
                fontFamily: 'var(--cf-font-text)',
                fontSize: 13,
                color: 'var(--th-text-tertiary)',
                letterSpacing: '-0.12px',
              }}
            >
              Connect platforms to see recommendations.
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Box sx={{ ...cardSx, height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 18, color: '#ff9f0a' }} />
              <Typography
                sx={{
                  fontFamily: 'var(--cf-font-display)',
                  fontSize: 17,
                  fontWeight: 600,
                  color: 'var(--th-text-primary)',
                  letterSpacing: '-0.374px',
                }}
              >
                Content Gaps
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {contentGaps.map((gap, i) => (
                <Typography
                  key={i}
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 13,
                    color: 'var(--th-text-secondary)',
                    letterSpacing: '-0.12px',
                    lineHeight: 1.47,
                  }}
                >
                  {gap}
                </Typography>
              ))}
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  )
}
