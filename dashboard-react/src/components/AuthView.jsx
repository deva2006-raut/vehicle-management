import React, { useState } from 'react';
import {
  Box, Card, TextField, Button, Typography,
  MenuItem, Select, InputLabel, FormControl, Alert, IconButton,
  InputAdornment, CircularProgress
} from '@mui/material';
import {
  ShieldCheck, Mail, Lock, Eye, EyeOff, User, MapPin,
  Route, Navigation, Truck, Boxes, Gauge
} from 'lucide-react';
import { userService } from '../services/userService';

const BRAND_FEATURES = [
  { icon: <Route size={18} />, title: 'Smart Route Planning', desc: 'Optimised Indian-road routes with toll & traffic awareness' },
  { icon: <Gauge size={18} />, title: 'Live Cost & ETA', desc: 'Transparent pricing, fuel and arrival estimates' },
  { icon: <MapPin size={18} />, title: 'Saved Locations', desc: 'Home, Work, College & favourites — one tap away' },
  { icon: <Truck size={18} />, title: 'Fleet Your Way', desc: 'Cars, vans & trucks for every delivery need' }
];

export default function AuthView({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      if (mode === 'login') {
        const usr = await userService.login({ email, password });
        onLogin(usr);
      } else {
        const usr = await userService.signup({ name, email, password });
        setSuccess('Account created! Welcome to VROOM.');
        onLogin(usr);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setSuccess('');
  };

  return (
    <Box sx={{
      minHeight: '100vh', width: '100%', display: 'flex', alignItems: 'stretch',
      background: 'radial-gradient(1200px 600px at 20% -10%, #1e2a52 0%, #0b0f19 55%, #070a12 100%)',
      overflow: 'auto'
    }}>
      {/* ---- Left brand panel ---- */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' }, flexDirection: 'column', justifyContent: 'space-between',
        width: '46%', p: { md: 6, lg: 8 }, color: 'white',
        background: 'linear-gradient(160deg, rgba(99,102,241,0.16), rgba(139,92,246,0.08) 60%, rgba(0,0,0,0) 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)'
      }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ display: 'inline-flex', p: 1.3, borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 6px 24px rgba(99,102,241,0.5)' }}>
              <Navigation size={22} />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
              VROOM <Box component="span" sx={{ background: 'linear-gradient(90deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>India</Box>
            </Typography>
          </Box>

          <Typography variant="h3" sx={{ fontWeight: 800, mt: 7, fontSize: { lg: 42, md: 34 }, lineHeight: 1.15, letterSpacing: '-1px' }}>
            India-first route<br />optimization &amp; fleet OS
          </Typography>
          <Typography variant="body1" sx={{ mt: 2.5, color: 'rgba(255,255,255,0.65)', maxWidth: 460, fontSize: 16 }}>
            Plan smarter journeys, cut fuel &amp; tolls, track your fleet in real time — built for Indian roads, cities and delivery networks.
          </Typography>

          <Box sx={{ mt: 5, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            {BRAND_FEATURES.map((f, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', p: 2 }}>
                <Box sx={{ color: '#a5b4fc', mt: 0.3 }}>{f.icon}</Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13.5 }}>{f.title}</Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', display: 'block', mt: 0.4, lineHeight: 1.4 }}>{f.desc}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, color: 'rgba(255,255,255,0.5)', mt: 5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Truck size={16} /> Fleet ready</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Boxes size={16} /> Dispatch hub</Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ShieldCheck size={16} /> Secure &amp; private</Box>
        </Box>
      </Box>

      {/* ---- Right auth form ---- */}
      <Box sx={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 3, sm: 5 }
      }}>
        <Card className="glass-panel" sx={{
          width: '100%', maxWidth: 440, p: { xs: 3, sm: 4.5 }, borderRadius: '22px',
          background: 'rgba(18, 25, 42, 0.72)', border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 70px rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)'
        }}>
          {/* Mobile brand */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ display: 'inline-flex', p: 1.2, borderRadius: '12px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              <Navigation size={20} color="white" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              VROOM <Box component="span" sx={{ color: '#a5b4fc' }}>India</Box>
            </Typography>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.4px' }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-muted)', mt: 0.6, mb: 3, fontSize: 13.5 }}>
            {mode === 'login'
              ? 'Sign in to plan routes, save places and manage your fleet.'
              : 'Join VROOM and start optimising your journeys today.'}
          </Typography>

          {mode === 'login' && (
            <Box sx={{ mb: 2.5, p: 1.25, borderRadius: '12px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6, display: 'block' }}>
                <b style={{ color: '#a5b4fc' }}>Demo login</b> — try:
                <br /><span style={{ fontFamily: 'monospace' }}>admin@vroom.in / admin123</span>
                <br /><span style={{ fontFamily: 'monospace' }}>user@vroom.in / user123</span>
              </Typography>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2, borderRadius: '10px' }}>{success}</Alert>}

          <form onSubmit={submit}>
            {mode === 'register' && (
              <TextField
                fullWidth label="Full Name" variant="outlined" value={name}
                onChange={(e) => setName(e.target.value)} sx={{ mb: 2 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><User size={17} /></InputAdornment>
                }}
              />
            )}

            <TextField
              fullWidth label="Email Address" variant="outlined" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} sx={{ mb: 2 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><Mail size={17} /></InputAdornment> }}
            />

            <TextField
              fullWidth label="Password" variant="outlined" type={showPw ? 'text' : 'password'} value={password}
              onChange={(e) => setPassword(e.target.value)} sx={{ mb: mode === 'login' ? 2 : 0 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Lock size={17} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPw(v => !v)}>
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              InputLabelProps={{ shrink: true }}
            />

            {mode === 'register' && (
              <FormControl fullWidth sx={{ mt: 2, mb: 1 }}>
                <InputLabel>Account type</InputLabel>
                <Select value={role} label="Account type" onChange={(e) => setRole(e.target.value)}>
                  <MenuItem value="user">Planner / Dispatcher</MenuItem>
                  <MenuItem value="driver">Driver</MenuItem>
                  <MenuItem value="admin">Administrator</MenuItem>
                </Select>
              </FormControl>
            )}

            <Button
              fullWidth type="submit" variant="contained" disabled={busy}
              startIcon={busy ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{
                mt: 3, py: 1.6, borderRadius: '12px', fontWeight: 700, fontSize: 15,
                textTransform: 'none', color: 'white',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 8px 28px rgba(99,102,241,0.45)',
                '&:hover': { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', transform: 'translateY(-1px)' }
              }}
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3, fontSize: 13.5 }}>
            {mode === 'login' ? (
              <>
                <Button sx={{ textTransform: 'none', color: 'var(--text-muted)' }} onClick={() => setMode('register')}>
                  New here? <Box component="span" sx={{ color: '#818cf8', fontWeight: 600, ml: 0.4 }}>Create account</Box>
                </Button>
              </>
            ) : (
              <Button sx={{ textTransform: 'none', color: 'var(--text-muted)' }} onClick={() => switchMode('login')}>
                Already have an account? <Box component="span" sx={{ color: '#818cf8', fontWeight: 600, ml: 0.4 }}>Sign in</Box>
              </Button>
            )}
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
