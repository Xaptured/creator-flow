'use client'

import useSWR from 'swr'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material'
import PermMediaOutlinedIcon from '@mui/icons-material/PermMediaOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import { MediaFile } from '@/lib/response/media'
import { getMediaFiles } from '@/service/getService'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (file: MediaFile) => void
}

export default function VaultPickerDialog({ open, onClose, onSelect }: Props) {
  const { data: files = [], isLoading } = useSWR<MediaFile[]>(
    open ? '/api/media' : null,
    getMediaFiles
  )

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
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontFamily: 'var(--cf-font-display)',
          fontSize: 17,
          fontWeight: 600,
          color: 'var(--th-text-primary)',
          letterSpacing: '-0.2px',
          borderBottom: '1px solid var(--th-border)',
          pb: 2,
        }}
      >
        Pick from Vault
      </DialogTitle>

      <DialogContent sx={{ p: 2, minHeight: 200 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
            <CircularProgress size={24} sx={{ color: 'var(--cf-blue)' }} />
          </Box>
        )}

        {!isLoading && files.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              pt: 4,
            }}
          >
            <PermMediaOutlinedIcon sx={{ fontSize: 36, color: 'var(--th-text-tertiary)' }} />
            <Typography
              sx={{
                fontFamily: 'var(--cf-font-text)',
                fontSize: 13,
                color: 'var(--th-text-tertiary)',
                textAlign: 'center',
              }}
            >
              No uploaded files yet. Upload media via the Vault first.
            </Typography>
          </Box>
        )}

        {!isLoading && files.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1 }}>
            {files.map((file) => (
              <Box
                key={file.id}
                onClick={() => { onSelect(file); onClose() }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  borderRadius: '10px',
                  border: '1px solid var(--th-border)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background-color 0.15s',
                  '&:hover': {
                    borderColor: 'var(--cf-blue)',
                    backgroundColor: 'rgba(0,113,227,0.04)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '8px',
                    backgroundColor: 'var(--th-bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {file.readUrl && file.mimeType.startsWith('image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.readUrl}
                      alt={file.originalName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <PermMediaOutlinedIcon sx={{ fontSize: 22, color: 'var(--th-text-tertiary)' }} />
                  )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    noWrap
                    sx={{
                      fontFamily: 'var(--cf-font-text)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--th-text-primary)',
                      letterSpacing: '-0.12px',
                    }}
                  >
                    {file.originalName}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: 'var(--cf-font-text)',
                      fontSize: 11,
                      color: 'var(--th-text-tertiary)',
                      letterSpacing: '-0.1px',
                    }}
                  >
                    {file.mimeType} · {(file.sizeBytes / (1024 * 1024)).toFixed(1)} MB
                  </Typography>
                </Box>

                <CheckCircleOutlinedIcon
                  sx={{ fontSize: 16, color: 'var(--cf-blue)', opacity: 0, flexShrink: 0 }}
                />
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, borderTop: '1px solid var(--th-border)', pt: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            fontFamily: 'var(--cf-font-text)',
            fontSize: 13,
            color: 'var(--th-text-secondary)',
            textTransform: 'none',
            borderRadius: '8px',
            '&:hover': { backgroundColor: 'var(--th-bg-surface)' },
          }}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  )
}
