'use client'

import { Box, CircularProgress, Skeleton, Typography } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import useSWR from 'swr'
import { fetchBestTime } from '@/service/getService'
import { BestTimeResponse, TrendingPlatform } from '@/lib/response/ai'

const cardSx = {
  backgroundColor: 'var(--th-bg-card)',
  border: '1px solid var(--th-border-card)',
  borderRadius: '12px',
  p: 3,
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const RANKED_COLOR = '#0071e3'
const LOW_SAMPLE_COLOR = 'rgba(0, 113, 227, 0.25)'

/** 18 → "6PM", 9 → "9AM", 0 → "12AM" */
function blockShort(startHour: number): string {
  const meridiem = startHour < 12 ? 'AM' : 'PM'
  const twelve = startHour % 12 === 0 ? 12 : startHour % 12
  return `${twelve}${meridiem}`
}

interface BestTimeChartProps {
  /** Platform from the Analytics tabs — this chart only renders per-platform. */
  platform: TrendingPlatform
}

/**
 * "Best Day & Time to Post" bar chart (MUI X Charts).
 * SINGLE series with per-bar colors via the x-axis ordinal colorMap — two
 * series in a band scale would render bars off-centre (each band reserves a
 * slot per series) and make the tooltip list both series. Low-sample buckets
 * are faded and annotated in the tooltip instead.
 */
export default function BestTimeChart({ platform }: BestTimeChartProps) {
  const { data, isLoading, error } = useSWR<BestTimeResponse>(
    ['/api/ai/best-time', platform],
    () => fetchBestTime(platform),
    {
      revalidateOnFocus: false,
      dedupingInterval: 3_600_000,
    }
  )

  const buckets = [...(data?.buckets ?? [])].sort(
    (a, b) => b.avgEngagement - a.avgEngagement
  )
  const labels = buckets.map(
    (b) => `${DAY_SHORT[b.dow]} ${blockShort(b.hourBlock)}`
  )
  const values = buckets.map((b) => Number((b.avgEngagement * 100).toFixed(2)))
  const barColors = buckets.map((b) =>
    b.lowSample ? LOW_SAMPLE_COLOR : RANKED_COLOR
  )
  const hasLowSample = buckets.some((b) => b.lowSample)

  return (
    <Box sx={{ ...cardSx, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-display)',
            fontSize: 17,
            fontWeight: 600,
            color: 'var(--th-text-primary)',
            letterSpacing: '-0.374px',
          }}
        >
          Best Day &amp; Time to Post
        </Typography>
        {isLoading && (
          <CircularProgress size={12} sx={{ color: 'var(--cf-blue)', ml: 'auto' }} />
        )}
      </Box>

      {data && buckets.length > 0 && (
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-text)',
            fontSize: 12,
            color: 'var(--th-text-tertiary)',
            letterSpacing: '-0.12px',
            mb: 1,
          }}
        >
          Average engagement by posting time — {data.timezone}.
          {hasLowSample && ' Faded bars have too few posts to rank.'}
        </Typography>
      )}

      {isLoading && (
        <Skeleton variant="rounded" height={220} sx={{ bgcolor: 'var(--th-border)', borderRadius: '8px' }} />
      )}

      {!isLoading && (error || buckets.length === 0) && (
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
            {error
              ? 'Could not load posting-time data right now.'
              : 'Chart loads once you have published posts on this platform.'}
          </Typography>
        </Box>
      )}

      {!isLoading && !error && buckets.length > 0 && (
        <>
          <BarChart
            height={240}
            tooltip={{ trigger: 'item' }}
            xAxis={[
              {
                scaleType: 'band',
                data: labels,
                tickLabelStyle: { fill: 'var(--th-text-tertiary)', fontSize: 11 },
                colorMap: {
                  type: 'ordinal',
                  values: labels,
                  colors: barColors,
                },
              },
            ]}
            yAxis={[
              {
                label: 'Engagement %',
                tickLabelStyle: { fill: 'var(--th-text-tertiary)', fontSize: 11 },
                labelStyle: { fill: 'var(--th-text-tertiary)', fontSize: 11 },
              },
            ]}
            series={[
              {
                data: values,
                label: 'Avg engagement',
                valueFormatter: (value, { dataIndex }) =>
                  value == null
                    ? ''
                    : `${value}%${buckets[dataIndex]?.lowSample ? ' — too few posts to rank' : ` over ${buckets[dataIndex]?.sampleSize} posts`}`,
              },
            ]}
            slotProps={{ legend: { hidden: true } }}
            sx={{
              '& .MuiChartsAxis-line, & .MuiChartsAxis-tick': {
                stroke: 'var(--th-border)',
              },
            }}
            margin={{ left: 55, right: 10, top: 15, bottom: 30 }}
          />
          {data?.recommendation && data.bestSlots.length > 0 && (
            <Typography
              sx={{
                fontFamily: 'var(--cf-font-text)',
                fontSize: 13,
                color: 'var(--th-text-secondary)',
                letterSpacing: '-0.12px',
                lineHeight: 1.5,
                mt: 1,
              }}
            >
              {data.recommendation}
            </Typography>
          )}
        </>
      )}
    </Box>
  )
}
