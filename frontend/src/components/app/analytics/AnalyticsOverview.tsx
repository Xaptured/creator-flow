'use client'

import { useState } from 'react'
import { Box, Typography, Tab, Tabs, Grid } from '@mui/material'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import PostAnalyticsDetail from './PostAnalyticsDetail'

const PLATFORMS = ['All', 'YouTube', 'Instagram', 'Twitter/X']

const statCards = [
  { label: 'Total Views', value: '—' },
  { label: 'Likes', value: '—' },
  { label: 'Comments', value: '—' },
  { label: 'Engagement Rate', value: '—' },
]

const topPosts = [
  { id: 'post-1', title: 'My first video post', platform: 'YouTube', views: '—', likes: '—', engagement: '—' },
  { id: 'post-2', title: 'Behind the scenes reel', platform: 'Instagram', views: '—', likes: '—', engagement: '—' },
  { id: 'post-3', title: 'Weekly thread recap', platform: 'Twitter/X', views: '—', likes: '—', engagement: '—' },
]

const cardSx = {
  backgroundColor: 'var(--th-bg-card)',
  border: '1px solid var(--th-border-card)',
  borderRadius: '12px',
  p: 3,
}

export default function AnalyticsOverview() {
  const [platform, setPlatform] = useState(0)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)

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
          Analytics
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
          Last 30 days across all connected platforms.
        </Typography>
      </Box>

      <Tabs
        value={platform}
        onChange={(_, v) => setPlatform(v)}
        sx={{
          mb: 3,
          borderBottom: '1px solid var(--th-border)',
          '& .MuiTab-root': {
            fontFamily: 'var(--cf-font-text)',
            fontSize: 14,
            fontWeight: 400,
            color: 'var(--th-text-secondary)',
            textTransform: 'none',
            letterSpacing: '-0.224px',
            minHeight: 44,
            '&.Mui-selected': { color: 'var(--cf-blue)', fontWeight: 600 },
          },
          '& .MuiTabs-indicator': { backgroundColor: 'var(--cf-blue)' },
        }}
      >
        {PLATFORMS.map(p => <Tab key={p} label={p} />)}
      </Tabs>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statCards.map(stat => (
          <Grid item xs={6} xl={3} key={stat.label}>
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
                  fontSize: 28,
                  fontWeight: 600,
                  color: 'var(--th-text-primary)',
                  letterSpacing: '-0.28px',
                  lineHeight: 1.1,
                }}
              >
                {stat.value}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ ...cardSx, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <TrendingUpOutlinedIcon sx={{ fontSize: 18, color: 'var(--cf-blue)' }} />
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-display)',
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--th-text-primary)',
              letterSpacing: '-0.374px',
            }}
          >
            Engagement Rate Trend
          </Typography>
        </Box>
        <Box
          sx={{
            height: 180,
            borderRadius: '8px',
            backgroundColor: 'var(--th-bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: 14,
              color: 'var(--th-text-tertiary)',
              letterSpacing: '-0.224px',
            }}
          >
            Chart renders once platforms are connected.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ ...cardSx, mb: 3 }}>
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-display)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--th-text-primary)',
            letterSpacing: '-0.374px',
            mb: 3,
          }}
        >
          Best Day &amp; Time to Post
        </Typography>
        <Box
          sx={{
            height: 120,
            borderRadius: '8px',
            backgroundColor: 'var(--th-bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: 14,
              color: 'var(--th-text-tertiary)',
              letterSpacing: '-0.224px',
            }}
          >
            Heatmap loads once you have published posts.
          </Typography>
        </Box>
      </Box>

      <Box sx={cardSx}>
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-display)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--th-text-primary)',
            letterSpacing: '-0.374px',
            mb: 2,
          }}
        >
          Top Performing Posts
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {topPosts.map((post, i) => (
            <Box
              key={post.id}
              onClick={() => setSelectedPostId(post.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.5,
                borderRadius: '8px',
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'var(--th-bg-surface)' },
                transition: 'background-color 0.1s ease',
              }}
            >
              <Typography
                sx={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--th-text-tertiary)',
                  width: 20,
                  textAlign: 'center',
                }}
              >
                {i + 1}
              </Typography>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 14,
                    color: 'var(--th-text-primary)',
                    letterSpacing: '-0.224px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {post.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 12,
                    color: 'var(--th-text-tertiary)',
                    letterSpacing: '-0.12px',
                  }}
                >
                  {post.platform}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                {[['Views', post.views], ['Likes', post.likes], ['Eng.', post.engagement]].map(([k, v]) => (
                  <Box key={k} sx={{ textAlign: 'right' }}>
                    <Typography
                      sx={{
                        fontFamily: 'var(--cf-font-text)',
                        fontSize: 12,
                        color: 'var(--th-text-tertiary)',
                        letterSpacing: '-0.12px',
                      }}
                    >
                      {k}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: 'var(--cf-font-display)',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--th-text-primary)',
                        letterSpacing: '-0.224px',
                      }}
                    >
                      {v}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      <PostAnalyticsDetail
        postId={selectedPostId}
        onClose={() => setSelectedPostId(null)}
      />
    </Box>
  )
}
