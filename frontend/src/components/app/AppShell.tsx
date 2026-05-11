'use client'

import { Box } from '@mui/material'
import AppSidebar from './AppSidebar'
import AppTopbar from './AppTopbar'

interface AppShellProps {
  children: React.ReactNode
  userName?: string
  userEmail?: string
  userImage?: string
}

export default function AppShell({ children, userName, userEmail, userImage }: AppShellProps) {
  const userProps = { userName, userEmail, userImage }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: 'var(--th-bg-primary)',
      }}
    >
      <Box sx={{ display: { xs: 'none', lg: 'flex' } }}>
        <AppSidebar {...userProps} />
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: '100vh',
        }}
      >
        <AppTopbar {...userProps} />

        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3, lg: 4 },
            overflow: 'auto',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
