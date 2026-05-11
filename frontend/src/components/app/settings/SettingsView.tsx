'use client'

import { Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Button, Divider } from '@mui/material'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'

const inputSx = {
  '& .MuiOutlinedInput-root': {
    fontFamily: 'var(--cf-font-text)',
    fontSize: 14,
    color: 'var(--th-text-primary)',
    backgroundColor: 'var(--th-input-bg)',
    borderRadius: '8px',
    '& fieldset': { borderColor: 'var(--th-input-border)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--cf-blue)' },
  },
  '& .MuiInputLabel-root': {
    fontFamily: 'var(--cf-font-text)',
    fontSize: 14,
    color: 'var(--th-text-tertiary)',
    '&.Mui-focused': { color: 'var(--cf-blue)' },
  },
}

const selectSx = {
  ...inputSx,
  '& .MuiSelect-icon': { color: 'var(--th-text-tertiary)' },
  '& .MuiSelect-select': {
    fontFamily: 'var(--cf-font-text)',
    fontSize: 14,
    color: 'var(--th-text-primary)',
  },
}

const cardSx = {
  backgroundColor: 'var(--th-bg-card)',
  border: '1px solid var(--th-border-card)',
  borderRadius: '12px',
  p: 3,
}

const CONTENT_NICHES = [
  'Gaming', 'Photography', 'Tech', 'Lifestyle', 'Travel',
  'Fitness', 'Food', 'Education', 'Business', 'Art & Design', 'Other',
]

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Paris',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore',
  'Asia/Tokyo', 'Australia/Sydney',
]

export default function SettingsView() {
  return (
    <Box sx={{ maxWidth: 600 }}>
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
          Settings
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
          Manage your profile and preferences.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={cardSx}>
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-display)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--th-text-primary)',
              letterSpacing: '-0.2px',
              mb: 2.5,
            }}
          >
            Profile
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Display Name"
              placeholder="Your creator name"
              variant="outlined"
              sx={inputSx}
            />

            <Box>
              <TextField
                fullWidth
                label="Email"
                variant="outlined"
                disabled
                helperText=""
                sx={{
                  ...inputSx,
                  '& .MuiOutlinedInput-root': {
                    ...inputSx['& .MuiOutlinedInput-root'],
                    '&.Mui-disabled': {
                      backgroundColor: 'var(--th-bg-surface)',
                      '& fieldset': { borderColor: 'var(--th-border)' },
                    },
                  },
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: 'var(--th-text-tertiary)',
                  },
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
                <LockOutlinedIcon sx={{ fontSize: 11, color: 'var(--th-text-tertiary)' }} />
                <Typography
                  sx={{
                    fontFamily: 'var(--cf-font-text)',
                    fontSize: 12,
                    color: 'var(--th-text-tertiary)',
                    letterSpacing: '-0.12px',
                  }}
                >
                  Managed by Keycloak. Change it there if needed.
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={cardSx}>
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-display)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--th-text-primary)',
              letterSpacing: '-0.2px',
              mb: 2.5,
            }}
          >
            Preferences
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth sx={selectSx}>
              <InputLabel>Content Niche</InputLabel>
              <Select
                label="Content Niche"
                defaultValue=""
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: 'var(--th-bg-card)',
                      border: '1px solid var(--th-border)',
                      borderRadius: '8px',
                      '& .MuiMenuItem-root': {
                        fontFamily: 'var(--cf-font-text)',
                        fontSize: 14,
                        color: 'var(--th-text-secondary)',
                        '&:hover': { backgroundColor: 'var(--th-bg-surface)' },
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(0,113,227,0.12)',
                          color: 'var(--cf-blue)',
                          '&:hover': { backgroundColor: 'rgba(0,113,227,0.18)' },
                        },
                      },
                    },
                  },
                }}
              >
                {CONTENT_NICHES.map(n => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth sx={selectSx}>
              <InputLabel>Timezone</InputLabel>
              <Select
                label="Timezone"
                defaultValue="UTC"
                MenuProps={{
                  PaperProps: {
                    sx: {
                      backgroundColor: 'var(--th-bg-card)',
                      border: '1px solid var(--th-border)',
                      borderRadius: '8px',
                      maxHeight: 300,
                      '& .MuiMenuItem-root': {
                        fontFamily: 'var(--cf-font-text)',
                        fontSize: 14,
                        color: 'var(--th-text-secondary)',
                        '&:hover': { backgroundColor: 'var(--th-bg-surface)' },
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(0,113,227,0.12)',
                          color: 'var(--cf-blue)',
                          '&:hover': { backgroundColor: 'rgba(0,113,227,0.18)' },
                        },
                      },
                    },
                  },
                }}
              >
                {TIMEZONES.map(tz => (
                  <MenuItem key={tz} value={tz}>{tz}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'var(--th-border)' }} />

        <Box>
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'var(--cf-blue)',
              color: '#ffffff',
              fontFamily: 'var(--cf-font-text)',
              fontSize: 14,
              fontWeight: 400,
              borderRadius: '8px',
              px: 3,
              py: 1,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': { backgroundColor: '#0077ed', boxShadow: 'none' },
            }}
          >
            Save Changes
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
