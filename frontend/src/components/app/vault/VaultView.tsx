'use client'

import React, { useRef, useState } from 'react'
import Image from 'next/image'
import useSWR from 'swr'
import {
  Box, Typography, Button, Grid, Skeleton, Chip, LinearProgress,
  Alert, Snackbar, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, IconButton,
} from '@mui/material'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import VideocamOutlinedIcon from '@mui/icons-material/VideocamOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { MediaFile } from '@/lib/response/media'
import { getMediaFiles } from '@/service/getService'
import { requestUploadUrl, confirmUpload } from '@/service/postService'
import { uploadToS3 } from '@/service/putService'
import { deleteMedia } from '@/service/deleteService'
import { toApiError } from '@/service/errorService'

// Must mirror backend MediaFileService.ALLOWED_MIME_TYPES
const ALLOWED_MIME_TYPES = new Set([
  'video/mp4',
  'image/jpeg',
  'image/png',
  'image/gif',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
])

const MAX_FILE_SIZE_BYTES = 524_288_000 // 500 MB

const cardSx = {
  backgroundColor: 'var(--th-bg-card)',
  border: '1px solid var(--th-border-card)',
  borderRadius: '12px',
  p: 3,
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileCardSkeleton() {
  return (
    <Box sx={{ backgroundColor: 'var(--th-bg-card)', border: '1px solid var(--th-border-card)', borderRadius: '12px', overflow: 'hidden' }}>
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
    return (
      <Image src={file.readUrl} alt={file.originalName} fill style={{ objectFit: 'cover' }}
        sizes="(max-width: 600px) 100vw, (max-width: 900px) 50vw, 25vw" />
    )
  }
  if (file.mimeType.startsWith('video/') && file.readUrl) {
    return <video src={file.readUrl} style={coverStyle} muted={true} />
  }
  if (file.mimeType.startsWith('video/')) {
    return <VideocamOutlinedIcon sx={{ fontSize: 36, color: 'var(--th-text-tertiary)' }} />
  }
  return <ImageOutlinedIcon sx={{ fontSize: 36, color: 'var(--th-text-tertiary)' }} />
}

interface FileCardProps {
  file: MediaFile
  onDeleteRequest: (file: MediaFile) => void
}

function FileCard({ file, onDeleteRequest }: FileCardProps) {
  const ready = isReadyStatus(file.status)
  const chipSx = {
    height: 18, fontSize: 10, fontFamily: 'var(--cf-font-text)', fontWeight: 600,
    backgroundColor: ready ? 'rgba(48,209,88,0.12)' : 'var(--th-bg-surface)',
    color: ready ? '#30d158' : 'var(--th-text-tertiary)',
    border: '1px solid',
    borderColor: ready ? 'rgba(48,209,88,0.25)' : 'var(--th-border)',
  }

  return (
    <Box sx={{
      backgroundColor: 'var(--th-bg-card)', border: '1px solid var(--th-border-card)',
      borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      '&:hover .delete-btn': { opacity: 1 },
    }}>
      <Box sx={{
        position: 'relative', width: '100%', height: 140,
        backgroundColor: 'var(--th-bg-surface)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        <FilePreview file={file} />
        <IconButton
          className="delete-btn"
          size="small"
          onClick={() => onDeleteRequest(file)}
          aria-label={`Delete ${file.originalName}`}
          sx={{
            position: 'absolute', top: 6, right: 6,
            backgroundColor: 'rgba(0,0,0,0.55)', color: '#ffffff',
            opacity: 0, transition: 'opacity 0.15s',
            '&:hover': { backgroundColor: 'rgba(255,59,48,0.85)' },
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      <Box sx={{ p: 2, flex: 1 }}>
        <Typography sx={{
          fontFamily: 'var(--cf-font-text)', fontSize: 13, fontWeight: 500,
          color: 'var(--th-text-primary)', letterSpacing: '-0.12px',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', mb: 0.5,
        }} title={file.originalName}>
          {file.originalName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 11, color: 'var(--th-text-tertiary)', letterSpacing: '-0.12px' }}>
            {formatBytes(file.sizeBytes)}
          </Typography>
          <Chip label={file.status} size="small" sx={chipSx} />
        </Box>
      </Box>
    </Box>
  )
}

type UploadState = { phase: 'idle' } | { phase: 'uploading'; progress: number; fileName: string }
type ToastState = { open: false } | { open: true; severity: 'success' | 'error'; message: string }
type DeleteState = { open: false } | { open: true; file: MediaFile; deleting: boolean }

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return `Unsupported file type: ${file.type}. Allowed: MP4, JPEG, PNG, GIF, MP3, WAV, OGG.`
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File too large. Maximum allowed size is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`
  }
  return null
}

export default function VaultView() {
  const { data: files, isLoading, error, mutate } = useSWR<MediaFile[]>(
    '/api/media', getMediaFiles, { revalidateOnFocus: true }
  )

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadState, setUploadState] = useState<UploadState>({ phase: 'idle' })
  const [toast, setToast] = useState<ToastState>({ open: false })
  const [deleteState, setDeleteState] = useState<DeleteState>({ open: false })

  const totalBytes = files?.reduce((acc, f) => acc + f.sizeBytes, 0) ?? 0

  function handleUploadClick() { fileInputRef.current?.click() }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!e.target.files) return
    e.target.value = ''
    if (!file) return

    const validationError = validateFile(file)
    if (validationError) { setToast({ open: true, severity: 'error', message: validationError }); return }

    setUploadState({ phase: 'uploading', progress: 0, fileName: file.name })
    try {
      const { mediaId, presignedUrl } = await requestUploadUrl({ fileName: file.name, mimeType: file.type, sizeBytes: file.size })
      await uploadToS3(presignedUrl, file, (percent) => { setUploadState({ phase: 'uploading', progress: percent, fileName: file.name }) })
      await confirmUpload({ mediaId })
      await mutate()
      setUploadState({ phase: 'idle' })
      setToast({ open: true, severity: 'success', message: `"${file.name}" uploaded successfully.` })
    } catch (err) {
      const apiErr = toApiError(err)
      setUploadState({ phase: 'idle' })
      setToast({ open: true, severity: 'error', message: apiErr.message ?? 'Upload failed. Please try again.' })
    }
  }

  function handleToastClose() { setToast({ open: false }) }
  function handleDeleteRequest(file: MediaFile) { setDeleteState({ open: true, file, deleting: false }) }
  function handleDeleteCancel() { setDeleteState({ open: false }) }

  async function handleDeleteConfirm() {
    if (!deleteState.open) return
    const { file } = deleteState
    setDeleteState({ open: true, file, deleting: true })
    try {
      await deleteMedia(file.id)
      await mutate()
      setDeleteState({ open: false })
      setToast({ open: true, severity: 'success', message: `"${file.originalName}" deleted.` })
    } catch (err) {
      const apiErr = toApiError(err)
      setDeleteState({ open: true, file, deleting: false })
      setToast({ open: true, severity: 'error', message: apiErr.message ?? 'Delete failed. Please try again.' })
    }
  }

  const isUploading = uploadState.phase === 'uploading'

  return (
    <Box>
      <input ref={fileInputRef} type="file"
        accept="video/mp4,image/jpeg,image/png,image/gif,audio/mpeg,audio/wav,audio/ogg"
        style={{ display: 'none' }} onChange={handleFileChange} />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography sx={{ fontFamily: 'var(--cf-font-display)', fontSize: { xs: 24, sm: 28 }, fontWeight: 600, color: 'var(--th-text-primary)', letterSpacing: '-0.28px', lineHeight: 1.14 }}>
            Vault
          </Typography>
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, color: 'var(--th-text-secondary)', letterSpacing: '-0.224px', mt: 0.5 }}>
            Upload and manage your media files.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<CloudUploadOutlinedIcon />} onClick={handleUploadClick} disabled={isUploading}
          sx={{ backgroundColor: 'var(--cf-blue)', color: '#ffffff', fontFamily: 'var(--cf-font-text)', fontSize: 14, fontWeight: 400, borderRadius: '8px', px: 2, py: 1, textTransform: 'none', boxShadow: 'none', '&:hover': { backgroundColor: '#0077ed', boxShadow: 'none' }, '&.Mui-disabled': { backgroundColor: 'var(--th-bg-surface)', color: 'var(--th-text-tertiary)' } }}>
          {isUploading ? 'Uploading…' : 'Upload'}
        </Button>
      </Box>

      {isUploading && (
        <Box sx={{ ...cardSx, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: 'var(--th-text-primary)', letterSpacing: '-0.12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
              {uploadState.fileName}
            </Typography>
            <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 13, color: 'var(--th-text-secondary)', letterSpacing: '-0.12px', flexShrink: 0 }}>
              {uploadState.progress}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={uploadState.progress}
            sx={{ borderRadius: 4, backgroundColor: 'var(--th-bg-surface)', '& .MuiLinearProgress-bar': { backgroundColor: 'var(--cf-blue)' } }} />
        </Box>
      )}

      <Box sx={{ ...cardSx, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, color: 'var(--th-text-secondary)', letterSpacing: '-0.224px' }}>
          Storage used
        </Typography>
        <Typography sx={{ fontFamily: 'var(--cf-font-display)', fontSize: 14, fontWeight: 600, color: 'var(--th-text-primary)', letterSpacing: '-0.224px' }}>
          {isLoading ? '—' : formatBytes(totalBytes)}
        </Typography>
      </Box>

      {error && !isLoading && (
        <Box sx={{ ...cardSx, mb: 3 }}>
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, color: '#ff4040', letterSpacing: '-0.224px' }}>
            Failed to load media files. Please try again later.
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
              <FileCard file={file} onDeleteRequest={handleDeleteRequest} />
            </Grid>
          ))}
        </Grid>
      ) : !error ? (
        <Box sx={{ ...cardSx, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, gap: 2 }}>
          <InsertDriveFileOutlinedIcon sx={{ fontSize: 48, color: 'var(--th-text-tertiary)' }} />
          <Typography sx={{ fontFamily: 'var(--cf-font-display)', fontSize: 17, fontWeight: 600, color: 'var(--th-text-primary)', letterSpacing: '-0.374px' }}>
            No files yet
          </Typography>
          <Typography sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, color: 'var(--th-text-tertiary)', letterSpacing: '-0.224px', textAlign: 'center', maxWidth: 320 }}>
            Upload videos, images, and thumbnails to use in your posts.
          </Typography>
        </Box>
      ) : null}

      <Dialog open={deleteState.open}
        onClose={deleteState.open && deleteState.deleting ? undefined : handleDeleteCancel}
        PaperProps={{ sx: { backgroundColor: 'var(--th-bg-card)', border: '1px solid var(--th-border-card)', borderRadius: '12px' } }}>
        <DialogTitle sx={{ fontFamily: 'var(--cf-font-display)', fontSize: 17, fontWeight: 600, color: 'var(--th-text-primary)', letterSpacing: '-0.374px' }}>
          Delete file?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, color: 'var(--th-text-secondary)', letterSpacing: '-0.224px' }}>
            {deleteState.open ? `"${deleteState.file.originalName}" will be permanently deleted from your vault and cannot be recovered.` : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={handleDeleteCancel} disabled={deleteState.open && deleteState.deleting}
            sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, textTransform: 'none', color: 'var(--th-text-secondary)', borderRadius: '8px' }}>
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} disabled={deleteState.open && deleteState.deleting}
            variant="contained"
            sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14, fontWeight: 400, textTransform: 'none', borderRadius: '8px', backgroundColor: '#ff3b30', boxShadow: 'none', '&:hover': { backgroundColor: '#d92d20', boxShadow: 'none' }, '&.Mui-disabled': { backgroundColor: 'var(--th-bg-surface)', color: 'var(--th-text-tertiary)' } }}>
            {deleteState.open && deleteState.deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={5000} onClose={handleToastClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {toast.open ? (
          <Alert onClose={handleToastClose} severity={toast.severity} variant="filled"
            sx={{ fontFamily: 'var(--cf-font-text)', fontSize: 14 }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  )
}
