import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, Chip, Button, TextField, IconButton,
  MenuItem, Select, InputLabel, FormControl, Switch, FormControlLabel,
  Divider, Snackbar, Alert, Grid, Avatar, Dialog, DialogTitle,
  DialogContent, DialogActions, Tooltip
} from '@mui/material';
import {
  Home, Briefcase, GraduationCap, MapPin, Star, Heart, Plus, X,
  Trash2, History, Settings2, User as UserIcon, Navigation, Zap
} from 'lucide-react';
import { userService } from '../services/userService';

const TAG_META = {
  home: { icon: <Home size={16} />, color: '#34d399', label: 'Home' },
  work: { icon: <Briefcase size={16} />, color: '#fbbf24', label: 'Work' },
  college: { icon: <GraduationCap size={16} />, color: '#60a5fa', label: 'College' },
  custom: { icon: <MapPin size={16} />, color: '#a78bfa', label: 'Place' }
};

export default function ProfileView({ user, onUserChange }) {
  const [profile, setProfile] = useState(user);
  const [name, setName] = useState(user?.name || '');
  const [prefs, setPrefs] = useState(user?.preferences || {});
  const [snack, setSnack] = useState('');
  const [saving, setSaving] = useState(false);

  // Add-location dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [locLabel, setLocLabel] = useState('');
  const [locTag, setLocTag] = useState('home');
  const [locAddress, setLocAddress] = useState('');
  const [locLat, setLocLat] = useState('');
  const [locLng, setLocLng] = useState('');
  const [locFavorite, setLocFavorite] = useState(false);

  // Refresh from backend on mount / user change.
  useEffect(() => {
    userService.me().then(u => {
      if (u) {
        setProfile(u);
        setName(u.name);
        setPrefs(u.preferences || {});
      }
    }).catch(() => {});
  }, [user?.id]);

  const notify = (m) => setSnack(m);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await userService.updateProfile({ name, preferences: prefs });
      setProfile(updated);
      if (typeof onUserChange === 'function') onUserChange(updated);
      notify('Profile updated');
    } catch (e) {
      notify(e.message);
    } finally {
      setSaving(false);
    }
  };

  const addLocation = async () => {
    if (!locLabel || !locLat || !locLng) return;
    try {
      const created = await userService.addSavedLocation({
        label: locLabel, address: locAddress || locLabel, lat: parseFloat(locLat),
        lng: parseFloat(locLng), tag: locTag, favorite: locFavorite
      });
      const updated = await userService.me();
      if (updated) setProfile(updated);
      notify('Location saved');
      setOpenAdd(false);
      setLocLabel(''); setLocAddress(''); setLocLat(''); setLocLng(''); setLocFavorite(false); setLocTag('home');
      void created;
    } catch (e) {
      notify(e.message);
    }
  };

  const removeLocation = async (id) => {
    try {
      await userService.deleteSavedLocation(id);
      const updated = await userService.me();
      if (updated) setProfile(updated);
      notify('Location removed');
    } catch (e) { notify(e.message); }
  };

  const toggleFav = async (id, fav) => {
    try {
      await userService.toggleFavorite(id, fav);
      const updated = await userService.me();
      if (updated) setProfile(updated);
    } catch (e) { notify(e.message); }
  };

  const clearHistory = async () => {
    try {
      await userService.clearHistory();
      const updated = await userService.me();
      if (updated) setProfile(updated);
      notify('History cleared');
    } catch (e) { notify(e.message); }
  };

  const initials = (profile?.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const saved = profile?.savedLocations || [];
  const history = profile?.history || [];
  const favs = saved.filter(l => l.favorite).length;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'inline-flex', p: 1.3, borderRadius: '13px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 6px 20px rgba(99,102,241,0.4)' }}>
          <UserIcon size={20} color="white" />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.4px' }}>Your VROOM profile</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-muted)', fontSize: 13 }}>
            Saved places, preferences &amp; recent journeys — synced to your account.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* LEFT COLUMN */}
        <Grid item xs={12} md={5}>
          {/* Profile card */}
          <Card sx={{ p: 3, borderRadius: '18px', background: 'rgba(18,25,42,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
              <Avatar sx={{ width: 62, height: 62, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 24, fontWeight: 800 }}>{initials}</Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{profile?.name}</Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-muted)', fontSize: 13 }}>{profile?.email}</Typography>
                <Chip size="small" label={(profile?.role || 'user').toUpperCase()} sx={{ mt: 0.6, textTransform: 'none', height: 22, fontSize: 11, background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', fontWeight: 600 }} />
              </Box>
            </Box>

            <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.08)' }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Settings2 size={15} /> Preferences
            </Typography>

            <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
              <InputLabel>Default vehicle</InputLabel>
              <Select value={prefs.vehicleType || 'car'} label="Default vehicle" onChange={(e) => setPrefs({ ...prefs, vehicleType: e.target.value })}>
                <MenuItem value="car">Car</MenuItem>
                <MenuItem value="bike">Bike / Two-wheeler</MenuItem>
                <MenuItem value="scooter">Scooter</MenuItem>
                <MenuItem value="van">Van</MenuItem>
                <MenuItem value="truck">Truck</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth sx={{ mb: 1.5 }}>
              <InputLabel>Route preference</InputLabel>
              <Select value={prefs.routeMode || 'fastest'} label="Route preference" onChange={(e) => setPrefs({ ...prefs, routeMode: e.target.value })}>
                <MenuItem value="fastest">Fastest</MenuItem>
                <MenuItem value="shortest">Shortest</MenuItem>
                <MenuItem value="cheapest">Cheapest (lowest cost)</MenuItem>
                <MenuItem value="ecofriendly">Eco-friendly</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel control={<Switch size="small" checked={!!prefs.avoidToll} onChange={(e) => setPrefs({ ...prefs, avoidToll: e.target.checked })} />} label={<Typography variant="body2" sx={{ fontSize: 13.5 }}>Avoid toll roads</Typography>} />
            <FormControlLabel control={<Switch size="small" checked={!!prefs.avoidHighway} onChange={(e) => setPrefs({ ...prefs, avoidHighway: e.target.checked })} />} label={<Typography variant="body2" sx={{ fontSize: 13.5 }}>Avoid highways</Typography>} />

            <TextField fullWidth size="small" label="Display name" value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1.5 }} />

            <Button fullWidth variant="contained" disabled={saving} onClick={saveProfile} sx={{ mt: 2, py: 1.3, borderRadius: '12px', fontWeight: 700, textTransform: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', '&:hover': { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' } }}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </Card>

          {/* History card */}
          <Card sx={{ p: 3, mt: 3, borderRadius: '18px', background: 'rgba(18,25,42,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                <History size={15} /> Recent journeys
              </Typography>
              {history.length > 0 && (
                <IconButton size="small" onClick={clearHistory} title="Clear history"><Trash2 size={15} /></IconButton>
              )}
            </Box>
            {history.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'var(--text-muted)', fontSize: 13 }}>No journeys yet. Plan a route to see it here.</Typography>
            ) : (
              history.slice(0, 6).map(h => (
                <Box key={h.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <Box sx={{ color: '#a5b4fc' }}><Zap size={15} /></Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.from} → {h.to}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      {h.distanceKm ? `${h.distanceKm} km` : '—'} · {h.durationMin ? `${h.durationMin} min` : '—'}
                    </Typography>
                  </Box>
                </Box>
              ))
            )}
          </Card>
        </Grid>

        {/* RIGHT COLUMN - Saved locations */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3, borderRadius: '18px', background: 'rgba(18,25,42,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MapPin size={15} /> Saved locations
                </Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{saved.length} saved · {favs} favourites</Typography>
              </Box>
              <Button variant="contained" size="small" startIcon={<Plus size={15} />} onClick={() => setOpenAdd(true)} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                Add place
              </Button>
            </Box>

            {saved.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Box sx={{ display: 'inline-flex', p: 2, borderRadius: '16px', background: 'rgba(99,102,241,0.1)', mb: 1.5, color: '#a5b4fc' }}>
                  <Heart size={28} />
                </Box>
                <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
                  No saved places yet. Add your Home, Work &amp; College for one-tap routing.
                </Typography>
              </Box>
            ) : (
              <Box sx={{ mt: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                {saved.map(l => {
                  const meta = TAG_META[l.tag] || TAG_META.custom;
                  return (
                    <Card key={l.id} sx={{ p: 2, borderRadius: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Box sx={{ display: 'inline-flex', p: 1, borderRadius: '10px', background: `${meta.color}22`, color: meta.color }}>{meta.icon}</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {l.label}
                            {l.favorite && <Heart size={13} color="#f472b6" fill="#f472b6" />}
                          </Typography>
                          <Chip size="small" label={meta.label} sx={{ height: 19, fontSize: 10.5, background: `${meta.color}22`, color: meta.color, fontWeight: 600 }} />
                        </Box>
                        <Tooltip title={l.favorite ? 'Remove favourite' : 'Add to favourites'}>
                          <IconButton size="small" onClick={() => toggleFav(l.id, !l.favorite)}>
                            <Star size={16} color={l.favorite ? '#fbbf24' : 'var(--text-muted)'} fill={l.favorite ? '#fbbf24' : 'none'} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove">
                          <IconButton size="small" onClick={() => removeLocation(l.id)}><X size={16} /></IconButton>
                        </Tooltip>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.address}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 10.5 }}>
                        {l.lat.toFixed(4)}, {l.lng.toFixed(4)}
                      </Typography>
                    </Card>
                  );
                })}
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Add-location dialog */}
      <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '18px', background: '#101627', border: '1px solid rgba(255,255,255,0.1)' } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Navigation size={18} color="#818cf8" /> Add a saved place
        </DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="Name" value={locLabel} onChange={(e) => setLocLabel(e.target.value)} sx={{ mb: 2, mt: 1 }} placeholder="e.g. Home, Café Canteen…" />
          <TextField fullWidth size="small" label="Address" value={locAddress} onChange={(e) => setLocAddress(e.target.value)} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
            <TextField fullWidth size="small" label="Latitude" type="number" value={locLat} onChange={(e) => setLocLat(e.target.value)} />
            <TextField fullWidth size="small" label="Longitude" type="number" value={locLng} onChange={(e) => setLocLng(e.target.value)} />
          </Box>
          <FormControl fullWidth size="small">
            <InputLabel>Tag</InputLabel>
            <Select value={locTag} label="Tag" onChange={(e) => setLocTag(e.target.value)}>
              <MenuItem value="home">Home</MenuItem>
              <MenuItem value="work">Work</MenuItem>
              <MenuItem value="college">College</MenuItem>
              <MenuItem value="custom">Other</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel control={<Switch size="small" checked={locFavorite} onChange={(e) => setLocFavorite(e.target.checked)} />} label={<Typography variant="body2" fontSize={13}>Mark as favourite</Typography>} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpenAdd(false)} sx={{ textTransform: 'none', color: 'var(--text-muted)' }}>Cancel</Button>
          <Button variant="contained" onClick={addLocation} sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>Save place</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={2500} onClose={() => setSnack('')} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSnack('')} sx={{ borderRadius: '10px' }}>{snack}</Alert>
      </Snackbar>
    </Box>
  );
}
