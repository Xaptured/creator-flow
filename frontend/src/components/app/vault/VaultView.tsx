'use client'

import React from 'react'
import useSWR from 'swr'
import { Box, Typography, Button, Grid, Skeleton, Chip } from '@mui/material'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import { MediaFile } from '@/lib/response/media'
import { getMediaFiles } from '@/service/getService'

const cardSx = {
  backgroundColor: "var(--th-bg-card)",
  border: "1px solid var(--th-border-card)",
  borderRadius: "12px",
  p: 3,
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileCardSkeleton() {
  return (
    <Box
      sx={{
        backgroundColor: "var(--th-bg-card)",
        border: "1px solid var(--th-border-card)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <Skeleton variant="rectangular" width="100%" height={140} />
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width="80%" height={18} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width="40%" height={14} />
      </Box>
    </Box>
  )
}

function isReadyStatus(status: string): boolean {
  return status === 'UPLOADED' || status === 'READY'
}

function FilePreview({ file }: { file: MediaFile }) {
  const coverStyle: React.CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' }
  if (file.mimeType.startsWith('image/') && file.readUrl) {
    return <img src={file.readUrl} alt={file.originalName} style={coverStyle} />
  }
  if (file.mimeType.startsWith('video/') && file.readUrl) {
    return <video src={file.readUrl} style={coverStyle} muted={true} />
  }
  if (file.mimeType.startsWith('video/')) {
    return <VideocamOutlinedIcon sx={{ fontSize: 36, color: "var(--th-text-tertiary)" }} />
  }
  return <ImageOutlinedIcon sx={{ fontSize: 36, color: "var(--th-text-tertiary)" }} />
}

function FileCard({ file }: { file: MediaFile }) {
  const ready = isReadyStatus(file.status)
  const chipSx = {
    height: 18,
    fontSize: 10,
    fontFamily: "var(--cf-font-text)",
    fontWeight: 600,
    backgroundColor: ready ? 'rgba(48,209,88,0.12)' : "var(--th-bg-surface)",
    color: ready ? '#30d158' : "var(--th-text-tertiary)",
    border: '1px solid',
    borderColor: ready ? 'rgba(48,209,88,0.25)' : "var(--th-border)",
  }

  return (
    <Box
      sx={{
        backgroundColor: "var(--th-bg-card)",
        border: "1px solid var(--th-border-card)",
        borderRadius: "12px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: 140,
          backgroundColor: "var(--th-bg-surface)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <FilePreview file={file} />
      </Box>

      <Box sx={{ p: 2, flex: 1 }}>
        <Typography
          sx={{
            fontFamily: "var(--cf-font-text)",
            fontSize: 13,
            fontWeight: 500,
            color: "var(--th-text-primary)",
            letterSpacing: "-0.12px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            mb: 0.5,
          }}
          title={file.originalName}
        >
          {file.originalName}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography
            sx={{
              fontFamily: "var(--cf-font-text)",
              fontSize: 11,
              color: "var(--th-text-tertiary)",
              letterSpacing: "-0.12px",
            }}
          >
            {formatBytes(file.sizeBytes)}
          </Typography>
          <Chip label={file.status} size="small" sx={chipSx} />
        </Box>
      </Box>
    </Box>
  )
}

export default function VaultView() {
  const { data: files, isLoading, error } = useSWR<MediaFile[]>(
    '/api/media',
    getMediaFiles,
    { revalidateOnFocus: true }
  )

  const totalBytes = files?.reduce((acc, f) => acc + f.sizeBytes, 0) ?? 0

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 4, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography
            sx={{
              fontFamily: "var(--cf-font-display)",
              fontSize: { xs: 24, sm: 28 },
              fontWeight: 600,
              color: "var(--th-text-primary)",
              letterSpacing: "-0.28px",
              lineHeight: 1.14,
            }}
          >
            Vault
          </Typography>
          <Typography
            sx={{
              fontFamily: "var(--cf-font-text)",
              fontSize: 14,
              color: "var(--th-text-secondary)",
              letterSpacing: "-0.224px",
              mt: 0.5,
            }}
          >
            Upload and manage your media files.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<CloudUploadOutlinedIcon />}
          sx={{
            backgroundColor: "var(--cf-blue)",
            color: "#ffffff",
            fontFamily: "var(--cf-font-text)",
            fontSize: 14,
            fontWeight: 400,
            borderRadius: "8px",
            px: 2,
            py: 1,
            textTransform: "none",
            boxShadow: "none",
            "&:hover": { backgroundColor: "#0077ed", boxShadow: "none" },
          }}
        >
          Upload
        </Button>
      </Box>

      <Box sx={{ ...cardSx, mb: 3, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography
          sx={{
            fontFamily: "var(--cf-font-text)",
            fontSize: 14,
            color: "var(--th-text-secondary)",
            letterSpacing: "-0.224px",
          }}
        >
          Storage used
        </Typography>
        <Typography
          sx={{
            fontFamily: "var(--cf-font-display)",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--th-text-primary)",
            letterSpacing: "-0.224px",
          }}
        >
          {isLoading ? '—' : formatBytes(totalBytes)}
        </Typography>
      </Box>

      {error && !isLoading && (
        <Box sx={{ ...cardSx, mb: 3 }}>
          <Typography
            sx={{
              fontFamily: "var(--cf-font-text)",
              fontSize: 14,
              color: "#ff4040",
              letterSpacing: "-0.224px",
            }}
          >
            Failed to load media files. Check that the media service is running.
          </Typography>
        </Box>
      )}

      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={i}>
              <FileCardSkeleton />
            </Grid>
          ))}
        </Grid>
      ) : !error && files && files.length > 0 ? (
        <Grid container spacing={2}>
          {files.map((file) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
              <FileCard file={file} />
            </Grid>
          ))}
        </Grid>
      ) : !error ? (
        <Box
          sx={{
            ...cardSx,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 10,
            gap: 2,
          }}
        >
          <InsertDriveFileOutlinedIcon sx={{ fontSize: 48, color: "var(--th-text-tertiary)" }} />
          <Typography
            sx={{
              fontFamily: "var(--cf-font-display)",
              fontSize: 17,
              fontWeight: 600,
              color: "var(--th-text-primary)",
              letterSpacing: "-0.374px",
            }}
          >
            No files yet
          </Typography>
          <Typography
            sx={{
              fontFamily: "var(--cf-font-text)",
              fontSize: 14,
              color: "var(--th-text-tertiary)",
              letterSpacing: "-0.224px",
              textAlign: "center",
              maxWidth: 320,
            }}
          >
            Upload videos, images, and thumbnails to use in your posts.
          </Typography>
        </Box>
      ) : null}
    </Box>
  )
}
