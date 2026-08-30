import React, { useState } from 'react';
import { 
  Box, List, ListItemButton, ListItemIcon, ListItemText, 
  Typography, Avatar, IconButton, Badge, Menu, MenuItem, 
  Switch, Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { 
  LayoutDashboard, Truck, Users, Package, MapPin, 
  FileText, Settings, LogOut, Bell, Sun, Moon, Sparkles, Navigation, UserRound, TriangleAlert
} from 'lucide-react';

export default function Layout({ 
  children, activeView, onViewChange, theme, onThemeToggle, user, onLogout, notifications 
}) {
  const [notiAnchor, setNotiAnchor] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const [showSOS, setShowSOS] = useState(false);

  // Navigation Items matching the modules requested
  const menuItems = [
    { id: 'planner', label: 'Navigation', icon: <Navigation size={20} /> },
    { id: 'profile', label: 'My Profile', icon: <UserRound size={20} /> },
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'map', label: 'Route Planner & Map', icon: <MapPin size={20} /> },
    { id: 'tracking', label: 'Live Tracking', icon: <Navigation size={20} /> },
    { id: 'reportsMap', label: 'Road Problem Reports', icon: <TriangleAlert size={20} /> },
    { id: 'vehicles', label: 'Fleet Management', icon: <Truck size={20} /> },
    { id: 'drivers', label: 'Drivers Fleet', icon: <Users size={20} /> },
    { id: 'orders', label: 'Orders Dispatch', icon: <Package size={20} /> },
    { id: 'reports', label: 'Analytics Reports', icon: <FileText size={20} /> },
    { id: 'settings', label: 'System Settings', icon: <Settings size={20} /> }
  ];

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      {/* Sidebar navigation */}
      <Box sx={{ 
        width: 280, 
        backgroundColor: 'var(--bg-secondary)', 
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(20px)',
        zIndex: 5
      }}>
        {/* Header Branding */}
        <Box sx={{ p: 3, borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ 
            p: 1, 
            borderRadius: 'var(--radius-sm)', 
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
            display: 'flex' 
          }}>
            <Sparkles size={20} color="white" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1, letterSpacing: '-0.5px' }}>
              VROOM <span style={{ color: 'var(--accent-indigo)' }}>Optima</span>
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              LOGISTICS OS
            </Typography>
          </Box>
        </Box>

        {/* Menu Navigation */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {menuItems.map(item => (
              <ListItemButton 
                key={item.id}
                onClick={() => onViewChange(item.id)}
                selected={activeView === item.id}
                sx={{ 
                  borderRadius: 'var(--radius-sm)',
                  py: 1.25,
                  px: 2,
                  color: activeView === item.id ? 'var(--text-main)' : 'var(--text-muted)',
                  backgroundColor: activeView === item.id ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    '&:hover': { backgroundColor: 'rgba(99, 102, 241, 0.16)' }
                  },
                  '&:hover': {
                    color: 'var(--text-main)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)'
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: 36, 
                  color: activeView === item.id ? 'var(--accent-indigo)' : 'inherit'
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '14px', fontWeight: 500 }} />
              </ListItemButton>
            ))}
          </List>
        </Box>

        {/* Emergency SOS Button */}
        <Box sx={{ p: 2, borderTop: '1px solid var(--border-color)' }}>
          <Button 
            fullWidth 
            variant="contained" 
            color="error" 
            onClick={() => setShowSOS(true)}
            sx={{ 
              fontWeight: 600, 
              py: 1, 
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)' 
            }}
          >
            🚨 Emergency SOS
          </Button>
        </Box>

        {/* Footer User Profile Card */}
        <Box sx={{ 
          p: 2, 
          borderTop: '1px solid var(--border-color)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          backgroundColor: 'rgba(0, 0, 0, 0.08)' 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: 'var(--accent-indigo)', width: 36, height: 36 }}>
              {user.name.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '13px', lineHeight: 1.2 }}>
                {user.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'capitalize' }}>
                {user.role} Account
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onLogout} size="small" sx={{ color: 'var(--text-muted)' }}>
            <LogOut size={16} />
          </IconButton>
        </Box>
      </Box>

      {/* Main Workspace Frame */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Top Navbar */}
        <Box sx={{ 
          height: 70, 
          borderBottom: '1px solid var(--border-color)', 
          backgroundColor: 'var(--bg-secondary)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          px: 3,
          backdropFilter: 'blur(20px)',
          zIndex: 4
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {menuItems.find(i => i.id === activeView)?.label || 'VROOM Optima'}
          </Typography>

          {/* Right Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Theme Toggle */}
            <IconButton onClick={onThemeToggle} color="inherit">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </IconButton>

            {/* Notifications Popover */}
            <IconButton onClick={(e) => setNotiAnchor(e.currentTarget)} color="inherit">
              <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
                <Bell size={20} />
              </Badge>
            </IconButton>

            {/* Notifications Menu */}
            <Menu
              anchorEl={notiAnchor}
              open={Boolean(notiAnchor)}
              onClose={() => setNotiAnchor(null)}
              PaperProps={{
                sx: { 
                  width: 320, 
                  maxHeight: 400, 
                  bgcolor: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                  mt: 1.5 
                }
              }}
            >
              <Box sx={{ p: 2, borderBottom: '1px solid var(--border-color)' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Alerts & Notifications</Typography>
              </Box>
              {notifications.length === 0 ? (
                <MenuItem sx={{ py: 2, justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No new notifications
                </MenuItem>
              ) : (
                notifications.map(n => (
                  <MenuItem key={n.id} sx={{ py: 1.5, borderBottom: '1px solid var(--border-color)', whiteSpace: 'normal', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <Typography variant="subtitle2" sx={{ fontSize: '12px', fontWeight: n.read ? 400 : 600 }}>{n.title}</Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{n.message}</Typography>
                  </MenuItem>
                ))
              )}
            </Menu>
          </Box>
        </Box>

        {/* Content area */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3, position: 'relative' }}>
          {children}
        </Box>
      </Box>

      {/* SOS Dialog */}
      <Dialog open={showSOS} onClose={() => setShowSOS(false)}>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 600 }}>🚨 Emergency SOS Alert</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Triggering the SOS protocol will alert all dispatch controllers, log your current GPS coordinates, and broadcast a panic signal to emergency channels.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSOS(false)} color="inherit">Cancel</Button>
          <Button onClick={() => {
            alert('SOS alert successfully broadcasted to nearby fleet dispatchers!');
            setShowSOS(false);
          }} color="error" variant="contained">Broadcast Alert</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
