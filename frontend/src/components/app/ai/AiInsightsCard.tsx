'use client'

import { Box, Chip, CircularProgress, Skeleton, Typography } from '@mui/material'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import useSWR from 'swr'
import { getAiInsights } from '@/service/getService'
import { InsightsResponse } from '@/lib/response/ai'

const cardSx = {
  backgroundColor: 'var(--th-bg-card)',
  border: '1px solid var(--th-border-card)',
  borderRadius: '12px',
  p: 3,
  boxShadow: 'var(--cf-card-shadow)',
}

export default function AiInsightsCard() {
  const { data, isLoading, error } = useSWR<InsightsResponse>(
    '/api/ai/insights',
    getAiInsights,
    {
      revalidateOnFocus: false,
      // Cache for 1 hour — AI insights are expensive; no need to refetch every visit
      dedupingInterval: 3_600_000,
    }
  )

  return (
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
        {isLoading && (
          <CircularProgress size={12} sx={{ color: 'var(--cf-blue)', ml: 'auto' }} />
        )}
      </Box>

      {isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[0, 1, 2].map((i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Skeleton variant="circular" width={6} height={6} sx={{ mt: '7px', flexShrink: 0, bgcolor: 'var(--th-border)' }} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" sx={{ bgcolor: 'var(--th-border)', mb: 0.5 }} />
                <Skeleton variant="text" width="90%" sx={{ bgcolor: 'var(--th-border)' }} />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {error && !isLoading && (
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-text)',
            fontSize: 13,
            color: 'var(--th-text-tertiary)',
            letterSpacing: '-0.12px',
          }}
        >
          Could not load AI insights right now. Connect platforms and try again.
        </Typography>
      )}

      {data && !isLoading && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {data.insights.map((insight, i) => (
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
              <Box>
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--th-text-primary)',
                    letterSpacing: '-0.224px',
                    lineHeight: 1.47,
                    mb: 0.25,
                  }}
                >
                  {insight.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 13,
                    color: 'var(--th-text-secondary)',
                    letterSpacing: '-0.12px',
                    lineHeight: 1.47,
                    mb: 0.5,
                  }}
                >
                  {insight.description}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 12,
                    color: 'var(--cf-blue)',
                    letterSpacing: '-0.12px',
                    lineHeight: 1.4,
                  }}
                >
                  → {insight.actionableStep}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
