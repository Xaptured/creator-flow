'use client'

import { useState } from 'react'
import { Box, Typography, Tab, Tabs, Grid, Skeleton } from '@mui/material'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'
import useSWR from 'swr'
import PostAnalyticsDetail from './PostAnalyticsDetail'
import ContentGapCards from '@/components/app/ai/ContentGapCards'
import { getAnalyticsSummary, getTopPosts } from '@/service/getService'
import { TrendingPlatform } from '@/lib/response/ai'
import { PlatformSummary, TopPost } from '@/lib/response/analytics'
import { PlatformType } from '@/lib/response/scheduler'

const PLATFORM_TABS: { label: string; type: PlatformType | null }[] = [
  { label: 'All', type: null },
  { label: 'YouTube', type: PlatformType.YOUTUBE },
  { label: 'Instagram', type: PlatformType.INSTAGRAM },
  { label: 'Twitter/X', type: PlatformType.TWITTER },
]

const PLATFORM_LABELS: Record<string, string> = {
  [PlatformType.YOUTUBE]: 'YouTube',
  [PlatformType.INSTAGRAM]: 'Instagram',
  [PlatformType.TWITTER]: 'Twitter/X',
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const cardSx = {
  backgroundColor: 'var(--th-bg-card)',
  border: '1px solid var(--th-border-card)',
  borderRadius: '12px',
  p: 3,
}

export default function AnalyticsOverview() {
  const [platform, setPlatform] = useState(0)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)

  const platformType = PLATFORM_TABS[platform]?.type ?? null

  const { data: summary } = useSWR<PlatformSummary[]>(
    ['/api/analytics/summary', platformType],
    () => getAnalyticsSummary(platformType ?? undefined),
    { revalidateOnFocus: false }
  )

  const { data: topPosts } = useSWR<TopPost[]>(
    ['/api/analytics/top-posts', platformType],
    () => getTopPosts(platformType ?? undefined),
    { revalidateOnFocus: false }
  )

  const totals = (summary ?? []).reduce(
    (acc, r) => ({
      views: acc.views + (r.views ?? 0),
      likes: acc.likes + (r.likes ?? 0),
      comments: acc.comments + (r.comments ?? 0),
      impressions: acc.impressions + (r.impressions ?? 0),
    }),
    { views: 0, likes: 0, comments: 0, impressions: 0 }
  )

  const summaryLoading = summary === undefined

  const engagementRate =
    totals.impressions > 0
      ? `${(((totals.likes + totals.comments) / totals.impressions) * 100).toFixed(1)}%`
      : '—'

  const statCards = [
    { label: 'Total Views', value: formatCount(totals.views), loading: summaryLoading },
    { label: 'Likes', value: formatCount(totals.likes), loading: summaryLoading },
    { label: 'Comments', value: formatCount(totals.comments), loading: summaryLoading },
    ...(platformType !== null
      ? [{ label: 'Engagement Rate', value: engagementRate, loading: summaryLoading }]
      : []),
  ]

  const topPostRows = (topPosts ?? []).map((p) => ({
    id: p.contentId,
    title: p.title && p.title.trim().length > 0 ? p.title : `Post ${p.contentId.slice(0, 8)}`,
    platform: PLATFORM_LABELS[p.platform] ?? p.platform,
    views: formatCount(p.views ?? 0),
    likes: formatCount(p.likes ?? 0),
    engagement: p.engagementRate != null ? `${(p.engagementRate * 100).toFixed(1)}%` : '—',
  }))

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
          {platformType
            ? `Last 30 days — ${PLATFORM_LABELS[platformType]}.`
            : 'Last 30 days across all connected platforms.'}
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
        {PLATFORM_TABS.map(p => <Tab key={p.label} label={p.label} />)}
      </Tabs>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {statCards.map(stat => (
          <Grid item xs={6} xl={12 / statCards.length} key={stat.label}>
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
              {stat.loading ? (
                <Skeleton variant="text" width={70} height={38} sx={{ bgcolor: 'var(--th-border)' }} />
              ) : (
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
              )}
            </Box>
          </Grid>
        ))}
      </Grid>

      {/* Content gaps are not sourced for Twitter/X (Pro-tier cost) — hide the card on that tab. */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={platformType === PlatformType.TWITTER ? 12 : 8}>

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
          {topPostRows.length === 0 && (
            <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px' }}>
              No post analytics yet. Once your posts collect metrics, your top performers appear here.
            </Typography>
          )}
          {topPostRows.map((post, i) => (
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

        </Grid>

        {platformType !== PlatformType.TWITTER && (
          <Grid item xs={12} lg={4}>
            <ContentGapCards
              platform={(platformType ?? undefined) as TrendingPlatform | undefined}
            />
          </Grid>
        )}
      </Grid>

      <PostAnalyticsDetail
        postId={selectedPostId}
        onClose={() => setSelectedPostId(null)}
      />
    </Box>
  )
}
