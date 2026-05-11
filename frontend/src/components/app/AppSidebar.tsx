'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
  Tooltip,
} from '@mui/material'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import PermMediaOutlinedIcon from '@mui/icons-material/PermMediaOutlined'
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { signOut } from 'next-auth/react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const primaryNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <DashboardOutlinedIcon fontSize="small" /> },
  { label: 'Calendar', href: '/dashboard/calendar', icon: <CalendarMonthOutlinedIcon fontSize="small" /> },
  { label: 'Composer', href: '/dashboard/composer', icon: <EditNoteOutlinedIcon fontSize="small" /> },
  { label: 'Analytics', href: '/dashboard/analytics', icon: <BarChartOutlinedIcon fontSize="small" /> },
  { label: 'Vault', href: '/dashboard/vault', icon: <PermMediaOutlinedIcon fontSize="small" /> },
]

const secondaryNav: NavItem[] = [
  { label: 'Platforms', href: '/dashboard/platforms', icon: <LinkOutlinedIcon fontSize="small" /> },
  { label: 'Settings', href: '/dashboard/settings', icon: <SettingsOutlinedIcon fontSize="small" /> },
]

interface AppSidebarProps {
  userName?: string
  userEmail?: string
  userImage?: string
}

export default function AppSidebar({ userName, userEmail, userImage }: AppSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const navItemSx = (active: boolean) => ({
    borderRadius: '8px',
    mx: 1,
    mb: 0.5,
    px: 1.5,
    py: 1,
    color: active ? '#ffffff' : 'var(--th-text-secondary)',
    backgroundColor: active ? 'var(--cf-blue)' : 'transparent',
    '&:hover': {
      backgroundColor: active ? 'var(--cf-blue)' : 'var(--th-bg-surface)',
      color: '#ffffff',
    },
    transition: 'background-color 0.15s ease, color 0.15s ease',
  })

  const iconSx = (active: boolean) => ({
    color: active ? '#ffffff' : 'var(--th-text-secondary)',
    minWidth: 36,
  })

  return (
    <Box
      component="nav"
      sx={{
        width: 240,
        flexShrink: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--th-bg-secondary)',
        borderRight: '1px solid var(--th-border)',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}
    >
      <Box sx={{ px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '8px',
            backgroundColor: 'var(--cf-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-display)',
              fontSize: 14,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1,
            }}
          >
            CF
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: 'var(--cf-font-display)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--th-text-primary)',
            letterSpacing: '-0.2px',
          }}
        >
          CreatorFlow
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'var(--th-border)', mx: 2, mb: 1 }} />

      <List disablePadding sx={{ px: 0, flex: 1 }}>
        {primaryNav.map((item) => {
          const active = isActive(item.href)
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              sx={navItemSx(active)}
            >
              <ListItemIcon sx={iconSx(active)}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  letterSpacing: '-0.224px',
                }}
              />
            </ListItemButton>
          )
        })}
      </List>

      <Divider sx={{ borderColor: 'var(--th-border)', mx: 2, my: 1 }} />
      <List disablePadding sx={{ px: 0 }}>
        {secondaryNav.map((item) => {
          const active = isActive(item.href)
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              sx={navItemSx(active)}
            >
              <ListItemIcon sx={iconSx(active)}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontFamily: 'var(--cf-font-text)',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  letterSpacing: '-0.224px',
                }}
              />
            </ListItemButton>
          )
        })}
      </List>

      <Divider sx={{ borderColor: 'var(--th-border)', mx: 2, mt: 1 }} />
      <Box sx={{ px: 2, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          src={userImage}
          alt={userName}
          sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'var(--cf-blue)' }}
        >
          {userName?.[0]?.toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--th-text-primary)',
              letterSpacing: '-0.12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {userName ?? 'Creator'}
          </Typography>
          <Typography
            sx={{
              fontFamily: 'var(--cf-font-text)',
              fontSize: 11,
              color: 'var(--th-text-tertiary)',
              letterSpacing: '-0.08px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {userEmail ?? ''}
          </Typography>
        </Box>
        <Tooltip title="Sign out" placement="right">
          <Box
            component="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            sx={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 0.5,
              borderRadius: '6px',
              color: 'var(--th-text-tertiary)',
              '&:hover': { color: 'var(--th-text-primary)', backgroundColor: 'var(--th-bg-surface)' },
              transition: 'color 0.15s ease',
            }}
          >
            <LogoutOutlinedIcon fontSize="small" />
          </Box>
        </Tooltip>
      </Box>
    </Box>
  )
}
