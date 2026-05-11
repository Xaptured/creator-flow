'use client'

import { useState } from 'react'
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer,
  Box,
  Avatar,
} from '@mui/material'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { usePathname } from 'next/navigation'
import AppSidebar from './AppSidebar'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/calendar': 'Calendar',
  '/dashboard/composer': 'Composer',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/vault': 'Vault',
  '/dashboard/platforms': 'Platforms',
  '/dashboard/settings': 'Settings',
}

interface AppTopbarProps {
  userName?: string
  userEmail?: string
  userImage?: string
}

export default function AppTopbar({ userName, userEmail, userImage }: AppTopbarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname = usePathname()

  const pageTitle =
    Object.entries(PAGE_TITLES)
      .sort((a, b) => b[0].length - a[0].length) // longest match first
      .find(([route]) => pathname === route || pathname.startsWith(route + '/'))?.[1] ??
    'Dashboard'

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: 'var(--th-nav-bg)',
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
          borderBottom: '1px solid var(--th-border)',
          display: { xs: 'flex', lg: 'none' },
        }}
      >
        <Toolbar sx={{ minHeight: 56, px: 2, gap: 1 }}>
          <IconButton
            edge="start"
            onClick={() => setDrawerOpen(true)}
            sx={{ color: 'var(--th-text-primary)', mr: 0.5 }}
            aria-label="Open navigation"
          >
            <MenuOutlinedIcon />
          </IconButton>

          <Typography
            sx={{
              fontFamily: 'var(--cf-font-display)',
              fontSize: 17,
              fontWeight: 600,
              color: 'var(--th-text-primary)',
              letterSpacing: '-0.374px',
              flex: 1,
            }}
          >
            {pageTitle}
          </Typography>

          <Avatar
            src={userImage}
            alt={userName}
            sx={{ width: 30, height: 30, fontSize: 12, bgcolor: 'var(--cf-blue)' }}
          >
            {userName?.[0]?.toUpperCase()}
          </Avatar>
        </Toolbar>
      </AppBar>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        anchor="left"
        PaperProps={{
          sx: {
            backgroundColor: 'transparent',
            boxShadow: 'none',
            border: 'none',
          },
        }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setDrawerOpen(false)}
            sx={{
              position: 'absolute',
              top: 12,
              right: -44,
              zIndex: 1,
              color: 'var(--th-text-primary)',
              backgroundColor: 'var(--th-bg-secondary)',
              borderRadius: '50%',
              width: 36,
              height: 36,
              '&:hover': { backgroundColor: 'var(--th-bg-surface)' },
            }}
            aria-label="Close navigation"
          >
            <CloseOutlinedIcon fontSize="small" />
          </IconButton>
          <AppSidebar
            userName={userName}
            userEmail={userEmail}
            userImage={userImage}
          />
        </Box>
      </Drawer>
    </>
  )
}
