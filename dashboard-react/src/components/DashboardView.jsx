import React, { useMemo, useState } from 'react';
import {
  Box, Typography, Card, Grid, Chip, Button, IconButton, Tooltip,
  Avatar, TextField, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, Stack, Alert, Switch, FormControlLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboard, Truck, MapPin, Navigation, Bell, FileText, BarChart3,
  Sparkles, Plus, Phone, Search, Zap, CircleDollarSign, AlarmClock,
  Wallet, PackageCheck, TruckIcon, ShieldCheck, Activity,
  Send, X, RefreshCcw, ArrowUpRight
} from 'lucide-react';

import DashboardMap from './DashboardMap';
import { geocodingService, CITY_AREAS } from '../services/geocodingService';
import { getVehicleTypes, estimateTripCost } from '../services/pricingService';
import {
  deriveFleetStats, buildTrips, buildBookings, buildAlerts, buildDocuments,
  buildAnalytics, recommendVehicles, pricingBreakdown, formatINR, CITY_ANCHORS,
  docStatusMeta, NOW
} from '../services/transportService';

const vehicleTypes = getVehicleTypes();

const tripStatusColor = (s) => {
  switch (s) {
    case 'Delivered': return '#10b981';
    case 'In Transit': return '#3b82f6';
    case 'Assigned': return '#6366f1';
    case 'Scheduled': return '#a78bfa';
    case 'Delayed': return '#f59e0b';
    default: return '#64748b';
  }
};

function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.12)', color: 'var(--accent-indigo)' }}>
          {icon}
        </Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
          {subtitle && <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{subtitle}</Typography>}
        </Box>
      </Box>
      {action}
    </Box>
  );
}

function KpiCard({ icon, iconColor, label, value, delta, deltaUp }) {
  return (
    <Card sx={{ p: 2.5, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{ width: 42, height: 42, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${iconColor}22`, color: iconColor }}>
          {icon}
        </Box>
        {delta && (
          <Chip size="small" label={delta} sx={{ bgcolor: deltaUp ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)', color: deltaUp ? '#10b981' : '#f43f5e', fontWeight: 700, fontSize: 11 }} />
        )}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>{label}</Typography>
    </Card>
  );
}

const quickActions = [
  { label: 'New Booking', icon: <Plus size={16} />, color: '#6366f1' },
  { label: 'Assign Vehicle', icon: <Truck size={16} />, color: '#10b981' },
  { label: 'Contact Driver', icon: <Phone size={16} />, color: '#3b82f6' },
  { label: 'Generate Report', icon: <FileText size={16} />, color: '#f59e0b' },
  { label: 'Export Data', icon: <ArrowUpRight size={16} />, color: '#a78bfa' },
  { label: 'Pricing Engine', icon: <CircleDollarSign size={16} />, color: '#ec4899' }
];

const AI_SUGGESTIONS = [
  'Which vehicle is nearest?',
  'Show fleet utilisation',
  'Any overdue documents?',
  'Yesterday revenue summary',
  'Suggest a cheaper option'
];

export default function DashboardView({ vehicles, drivers, user }) {
  const [trips, setTrips] = useState(() => buildTrips(vehicles, drivers));
  const [opsFilter, setOpsFilter] = useState('All');
  const [aiMode, setAiMode] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiMsgs, setAiMsgs] = useState([]);
  const [recommend, setRecommend] = useState(() => recommendVehicles(trips, {}, { sort: 'best' }));
  const [recoSort, setRecoSort] = useState('best');
  const [alertsDismissed, setAlertsDismissed] = useState({});

  // Quick booking dialog
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bkFrom, setBkFrom] = useState(CITY_ANCHORS[0].id);
  const [bkTo, setBkTo] = useState(CITY_ANCHORS[1].id);
  const [bkType, setBkType] = useState('truck');
  const [bkSuccess, setBkSuccess] = useState(false);

  // Pricing engine
  const [priceType, setPriceType] = useState('truck');
  const [priceDist, setPriceDist] = useState(35);
  const [priceDur, setPriceDur] = useState(75);

  const fleetStats = useMemo(() => deriveFleetStats(vehicles), [vehicles]);
  const bookings = useMemo(() => buildBookings(trips), [trips]);
  const alerts = useMemo(() => buildAlerts(trips, vehicles), [trips, vehicles]);
  const docs = useMemo(() => buildDocuments(vehicles), [vehicles]);
  const analytics = useMemo(() => buildAnalytics(trips), [trips]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const who = user?.name || user?.email || 'there';
  const todayStr = NOW.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const price = pricingBreakdown(priceType, priceDist, priceDur);

  const recomputeRecommend = (sort) => {
    setRecoSort(sort);
    setRecommend(recommendVehicles(trips, {}, { sort }));
  };

  // ---- Quick booking ----
  const bkDist = useMemo(() => {
    const a = CITY_ANCHORS.find(c => c.id === bkFrom);
    const b = CITY_ANCHORS.find(c => c.id === bkTo);
    if (!a || !b) return 0;
    const dLat = a.coord[0] - b.coord[0];
    const dLng = a.coord[1] - b.coord[1];
    return Math.round(Math.hypot(dLat, dLng) * 111);
  }, [bkFrom, bkTo]);
  const bkPrice = estimateTripCost({ type: bkType, distanceKm: bkDist, durationMin: Math.round(bkDist * 2) });

  const confirmBooking = () => {
    const a = CITY_ANCHORS.find(c => c.id === bkFrom);
    const b = CITY_ANCHORS.find(c => c.id === bkTo);
    const newTrip = {
      id: 'TRIP-' + (1100 + trips.length),
      vehicleId: 0,
      vehicle: (vehicleTypes.find(v => v.id === bkType)?.label || 'Vehicle') + ' (New)',
      vehicleType: bkType,
      vehicleNumber: 'BOOKED',
      driverId: '',
      driver: 'Unassigned',
      driverPhone: '',
      pickup: a ? a.label : bkFrom,
      destination: b ? b.label : bkTo,
      pickupLat: a ? a.coord[0] : 20,
      pickupLng: a ? a.coord[1] : 78,
      dropLat: b ? b.coord[0] : 21,
      dropLng: b ? b.coord[1] : 79,
      distanceKm: bkDist,
      durationMin: Math.max(20, Math.round(bkDist * 2)),
      eta: new Date(NOW.getTime() + 2 * 3600 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: bkPrice.total,
      status: 'Scheduled',
      delayMin: 0,
      color: '#6366f1'
    };
    setTrips(prev => [newTrip, ...prev]);
    setBookingOpen(false);
    setBkSuccess(true);
    setTimeout(() => setBkSuccess(false), 4000);
  };

  // Filtered operations
  const filteredTrips = opsFilter === 'All' ? trips : trips.filter(t => t.status === opsFilter);
  const opsStatuses = ['All', ...Array.from(new Set(trips.map(t => t.status)))];

  const askAI = (q) => {
    const question = q || aiText;
    if (!question.trim()) return;
    const low = question.toLowerCase();
    let answer;
    if (low.includes('nearest') || low.includes('close')) {
      const top = recommend[0];
      answer = top
        ? `The nearest option is ${top.vehicle} (${top.vehicleType}) — about ${top.distanceKm} km away, ETA ~${top.etaMin} min. Estimated fare ${formatINR(top.priceTotal)}.`
        : 'No available vehicles found right now.';
    } else if (low.includes('utilisation') || low.includes('utilization') || low.includes('fleet')) {
      answer = `Fleet utilisation is ${analytics.utilizationPct}%. ${fleetStats.available} of ${fleetStats.totalVehicles} vehicles are available; ${fleetStats.onTrip} on trips; ${fleetStats.offline} offline.`;
    } else if (low.includes('document') || low.includes('overdue') || low.includes('expir')) {
      const exp = docs.filter(d => d.status === 'expired' || d.status === 'expiring');
      answer = exp.length
        ? `${exp.length} documents need attention (${exp.filter(d => d.status === 'expired').length} expired, ${exp.filter(d => d.status === 'expiring').length} expiring soon).`
        : 'All documents are valid.';
    } else if (low.includes('revenue') || low.includes('yesterday') || low.includes('summary')) {
      answer = `Today: ${bookings.activeCount + bookings.deliveredCount} active/delivered trips and ${formatINR(Math.round(bookings.totalRevenue * 1.15))} in delivered revenue. On-time rate ${analytics.onTimePct}%.`;
    } else if (low.includes('cheap') || low.includes('cheaper') || low.includes('cost')) {
      answer = recommend.slice(0, 3).map(r => `${r.vehicle}: ${formatINR(r.priceTotal)}`).join(' · ') || 'No data.';
    } else {
      answer = 'I can help with fleet status, nearest vehicles, pricing, documents and revenue. Try one of the suggestions below.';
    }
    setAiMsgs(prev => [...prev, { role: 'user', text: question }, { role: 'ai', text: answer }]);
    setAiText('');
  };

  return (
    <Box>
      {bkSuccess && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setBkSuccess(false)}>
          Booking confirmed! A new trip has been added to operations.
        </Alert>
      )}

      {/* ===== HEADER ===== */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
            {greeting}, <span style={{ color: 'var(--accent-indigo)' }}>{who}</span> 👋
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Activity size={15} color="#10b981" />
            Command Center · {todayStr}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip icon={<ShieldCheck size={15} />} label="System Online" sx={{ bgcolor: 'rgba(16,185,129,0.15)', color: '#10b981', fontWeight: 700 }} />
          <Button variant="outlined" startIcon={<RefreshCcw size={15} />} sx={{ textTransform: 'none' }} onClick={() => recomputeRecommend(recoSort)}>Refresh</Button>
          <Button variant="contained" startIcon={<Plus size={15} />} sx={{ textTransform: 'none', bgcolor: 'var(--accent-indigo)' }} onClick={() => setBookingOpen(true)}>New Booking</Button>
        </Stack>
      </Box>

      {/* ===== KPI ROW ===== */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<Truck size={22} />} iconColor="#6366f1" label="Fleet Vehicles" value={fleetStats.totalVehicles} delta="3 new" deltaUp />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<Navigation size={22} />} iconColor="#3b82f6" label="On Road" value={fleetStats.onTrip} delta={`${Math.round((fleetStats.onTrip / (fleetStats.totalVehicles || 1)) * 100)}% util`} deltaUp />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<Wallet size={22} />} iconColor="#10b981" label="Revenue Today" value={formatINR(Math.max(12000, bookings.totalRevenue))} delta="+12.5%" deltaUp />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard icon={<AlarmClock size={22} />} iconColor="#f59e0b" label="Open Alerts" value={alerts.filter(a => !alertsDismissed[a.id]).length} delta={`On-time ${analytics.onTimePct}%`} deltaUp />
        </Grid>
      </Grid>

      {/* ===== LIVE MAP + RECOMMENDATION ===== */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <SectionHeader
              icon={<LayoutDashboard size={17} />}
              title="Live Fleet Map"
              subtitle="Real-time positions & active routes"
              action={
                <Chip size="small" label={`${trips.length} trips`} sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: 'var(--accent-indigo)', fontWeight: 700 }} />
              }
            />
            <DashboardMap trips={trips} height={420} />
          </Card>
        </Grid>
        {/* Vehicle recommendation */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
            <SectionHeader
              icon={<Zap size={17} />}
              title="Best Fits"
              subtitle="Smart vehicle recommendation"
              action={
                <Tooltip title="Re-run recommendation"><IconButton size="small" onClick={() => recomputeRecommend(recoSort)}><RefreshCcw size={15} /></IconButton></Tooltip>
              }
            />
            <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
              {['best', 'nearest', 'cheapest', 'fastest'].map(s => (
                <Chip key={s} size="small" label={s[0].toUpperCase() + s.slice(1)}
                  onClick={() => recomputeRecommend(s)}
                  sx={{ bgcolor: recoSort === s ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.05)', color: recoSort === s ? '#fff' : 'var(--text-muted)', fontWeight: 600, '&:hover': { bgcolor: 'var(--accent-indigo)' } }} />
              ))}
            </Box>
            <Box sx={{ flex: 1 }}> 
              <Stack spacing={1.25}>
                {recommend.slice(0, 5).map((r, i) => (
                  <Box key={i} sx={{ p: 1.5, borderRadius: '14px', border: r.isRecommended ? '1px solid var(--accent-indigo)' : '1px solid var(--border-color)', background: r.isRecommended ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 30, height: 30, bgcolor: r.color + '33', color: r.color, fontSize: 15 }}><TruckIcon size={15} /></Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.1 }}>{r.vehicle} {r.isRecommended && <Chip size="small" label="Best" sx={{ ml: 0.5, height: 16, fontSize: 9, bgcolor: 'var(--accent-indigo)', color: '#fff' }} />}</Typography>
                          <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{r.vehicleType} · {r.driver}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>{formatINR(r.priceTotal)}</Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{r.distanceKm} km · {r.etaMin} min</Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ===== LOCATION SEARCH + PRICING ENGINE ===== */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', height: '100%' }}>
            <SectionHeader icon={<Search size={17} />} title="Location & Routing Search" subtitle="Search cities or landmarks across India" />
            <AreaSearch onSelect={(a, b) => { setBkFrom(a.id); setBkTo(b.id); setBookingOpen(true); }} />
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <SectionHeader icon={<CircleDollarSign size={17} />} title="Live Pricing Engine" subtitle="Instant multi-class fare estimate" />
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Vehicle Class</Typography>
                <TextField select size="small" fullWidth value={priceType} onChange={(e) => setPriceType(e.target.value)} sx={{ mt: 0.5 }}>
                  {vehicleTypes.map(v => <MenuItem key={v.id} value={v.id}>{v.label}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Distance (km)</Typography>
                <TextField size="small" type="number" fullWidth value={priceDist} onChange={(e) => setPriceDist(Number(e.target.value) || 0)} inputProps={{ min: 1 }} sx={{ mt: 0.5 }} />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Duration (min)</Typography>
                <TextField size="small" type="number" fullWidth value={priceDur} onChange={(e) => setPriceDur(Number(e.target.value) || 0)} inputProps={{ min: 1 }} sx={{ mt: 0.5 }} />
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, p: 2, borderRadius: '14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Estimated Total</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--accent-indigo)' }}>{formatINR(price.total)}</Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Fuel: {price.fuelLitres}L · {formatINR(price.fuel)}</Typography>
                  <br />
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Toll: {formatINR(price.toll)} · Service: {formatINR(price.serviceCharge)}</Typography>
                </Box>
              </Box>
              <Box sx={{ mt: 1.5 }}>
                <PriceBar label="Base" val={price.base} color="#6366f1" />
                <PriceBar label="Distance" val={price.perKm} color="#3b82f6" />
                <PriceBar label="Fuel" val={price.fuel} color="#10b981" />
                <PriceBar label="Toll" val={price.toll} color="#f59e0b" />
              </Box>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* ===== OPERATIONS + ALERTS ===== */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} lg={8}>
          <Card sx={{ p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <SectionHeader
              icon={<PackageCheck size={17} />}
              title="Operations Hub"
              subtitle="Live trip board"
              action={
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {opsStatuses.map(s => (
                    <Chip key={s} size="small" label={s} onClick={() => setOpsFilter(s)}
                      sx={{ bgcolor: opsFilter === s ? (s === 'All' ? 'var(--accent-indigo)' : tripStatusColor(s)) : 'rgba(255,255,255,0.05)', color: opsFilter === s ? '#fff' : 'var(--text-muted)', fontWeight: 600 }} />
                  ))}
                </Box>
              }
            />
            <TableContainer sx={{ maxHeight: 360, '::-webkit-scrollbar': { height: 6 } }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 700, borderColor: 'var(--border-color)' }}>Trip</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 700, borderColor: 'var(--border-color)' }}>Vehicle</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 700, borderColor: 'var(--border-color)' }}>Driver</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 700, borderColor: 'var(--border-color)' }}>Route</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 700, borderColor: 'var(--border-color)' }}>ETA</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 700, borderColor: 'var(--border-color)' }} align="right">Fare</TableCell>
                    <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 700, borderColor: 'var(--border-color)' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTrips.map(t => (
                    <TableRow key={t.id} hover sx={{ '&:hover': { background: 'rgba(99,102,241,0.05)' } }}>
                      <TableCell sx={{ fontWeight: 700, borderColor: 'var(--border-color)' }}>{t.id}</TableCell>
                      <TableCell sx={{ borderColor: 'var(--border-color)' }}>{t.vehicle}<Box component="span" sx={{ display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>{t.vehicleNumber}</Box></TableCell>
                      <TableCell sx={{ borderColor: 'var(--border-color)' }}>{t.driver || '—'}</TableCell>
                      <TableCell sx={{ borderColor: 'var(--border-color)', maxWidth: 150 }}>
                        <Typography variant="caption" sx={{ display: 'block', color: 'var(--text-muted)' }}>{t.pickup}</Typography>
                        <Typography variant="caption" sx={{ display: 'block' }}>→ {t.destination}</Typography>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'var(--border-color)' }}>{t.eta}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--accent-emerald)', borderColor: 'var(--border-color)' }}>{formatINR(t.price)}</TableCell>
                      <TableCell sx={{ borderColor: 'var(--border-color)' }}>
                        <Chip size="small" label={t.status} sx={{ bgcolor: tripStatusColor(t.status) + '22', color: tripStatusColor(t.status), fontWeight: 700, fontSize: 10 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTrips.length === 0 && (
                    <TableRow><TableCell colSpan={7} sx={{ textAlign: 'center', color: 'var(--text-muted)', py: 3 }}>No trips match this filter.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
        <Grid item xs={12} lg={4}>
          <Card sx={{ p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <SectionHeader icon={<Bell size={17} />} title="Smart Alerts" subtitle="Fleet & compliance" />
            <Stack spacing={1.25}>
              {alerts.filter(a => !alertsDismissed[a.id]).slice(0, 6).map(a => (
                <Box key={a.id} sx={{ p: 1.5, borderRadius: '12px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: 1 }}>
                  <Box sx={{ width: 8, borderRadius: 4, bgcolor: a.severity === 'high' ? '#f43f5e' : a.severity === 'medium' ? '#f59e0b' : '#3b82f6', flexShrink: 0 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{a.title}</Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', mb: 0.5 }}>{a.desc}</Typography>
                    <Button size="small" sx={{ textTransform: 'none', fontSize: 11, color: 'var(--accent-indigo)' }} onClick={() => setAlertsDismissed(prev => ({ ...prev, [a.id]: true }))}>{a.action}</Button>
                  </Box>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{a.time}</Typography>
                </Box>
              ))}
              {alerts.every(a => alertsDismissed[a.id]) && (
                <Typography variant="body2" sx={{ color: 'var(--text-muted)', textAlign: 'center', py: 2 }}>All clear — no pending alerts.</Typography>
              )}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* ===== ANALYTICS + DOCS + AI ===== */}
      <Grid container spacing={2.5}>
        <Grid item xs={12} lg={5}>
          <Card sx={{ p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <SectionHeader icon={<BarChart3 size={17} />} title="Revenue Analytics" subtitle="Weekly performance" />
            <Box sx={{ height: 220, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.weekly}>
                  <defs>
                    <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-indigo)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--accent-indigo)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickFormatter={(v) => (v >= 1000 ? (v / 1000) + 'k' : v)} />
                  <ReTooltip contentStyle={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: '#fff' }} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--accent-indigo)" fillOpacity={1} fill="url(#gRev)" name="Revenue ₹" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
            <Divider sx={{ my: 1.5, borderColor: 'var(--border-color)' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <Metric label="On-time trip score" value={`${analytics.onTimePct}%`} color="#10b981" />
              <Metric label="Distance covered" value={`${(analytics.totalDistanceKm / 1000).toFixed(1)}k km`} color="#6366f1" />
              <Metric label="Total trips" value={analytics.totalTrips} color="#f59e0b" />
            </Box>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <Card sx={{ p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <SectionHeader icon={<FileText size={17} />} title="Compliance" subtitle="Document health" />
            <Stack spacing={1}>
              {docs.slice(0, 5).map((d, i) => {
                const m = docStatusMeta(d.status);
                return (
                  <Box key={i} sx={{ p: 1.25, borderRadius: '10px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 650 }}>{d.vehicle}</Typography>
                      <Chip size="small" label={m.label} sx={{ bgcolor: m.color + '22', color: m.color, fontSize: 10, fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{d.type} · expires {d.expiry}</Typography>
                  </Box>
                );
              })}
            </Stack>
          </Card>
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
            <SectionHeader icon={<Sparkles size={17} />} title="AI Command Assistant" subtitle="Ask anything about your fleet" />
            <Box sx={{ flex: 1, maxHeight: 200, overflowY: 'auto', mb: 1, pr: 0.5 }}>
              {aiMsgs.length === 0 && (
                <Typography variant="body2" sx={{ color: 'var(--text-muted)', py: 2 }}>Hi! Ask me about your fleet status, nearest vehicles, pricing, documents or revenue.</Typography>
              )}
              <Stack spacing={1}>
                {aiMsgs.map((m, i) => (
                  <Box key={i} sx={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', p: 1.25, borderRadius: '12px', fontSize: 13, background: m.role === 'user' ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.05)', color: m.role === 'user' ? '#fff' : 'var(--text-main)' }}>
                    {m.text}
                  </Box>
                ))}
              </Stack>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
              {AI_SUGGESTIONS.map(s => (
                <Chip key={s} size="small" label={s} onClick={() => askAI(s)} sx={{ fontSize: 10, bgcolor: 'rgba(99,102,241,0.1)', color: 'var(--accent-indigo)' }} />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <TextField size="small" fullWidth variant="outlined" placeholder="Ask the assistant…" value={aiText} onChange={(e) => setAiText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && askAI()} sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' } }} />
              <IconButton sx={{ bgcolor: 'var(--accent-indigo)', color: '#fff' }} onClick={() => askAI()}><Send size={16} /></IconButton>
            </Box>
            <FormControlLabel control={<Switch checked={aiMode} onChange={(e) => setAiMode(e.target.checked)} size="small" />} label="Auto-route suggestions" sx={{ mt: 0.5, '& .MuiTypography-root': { fontSize: 12 } }} />
          </Card>
        </Grid>
      </Grid>

      {/* ===== QUICK ACTIONS ===== */}
      <Card sx={{ mt: 2.5, p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <SectionHeader icon={<Zap size={17} />} title="Quick Actions" subtitle="One-tap operations" />
        <Grid container spacing={1.5}>
          {quickActions.map((a, i) => (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={a.icon}
                onClick={() => {
                  if (a.label === 'Pricing Engine') document.querySelector('#pricing-anchor')?.scrollIntoView({ behavior: 'smooth' });
                  if (a.label === 'New Booking') setBookingOpen(true);
                }}
                sx={{ textTransform: 'none', justifyContent: 'flex-start', color: a.color, borderColor: a.color + '55', '&:hover': { borderColor: a.color, bgcolor: a.color + '12' }, borderRadius: '12px', py: 1.25 }}
              >
                {a.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Card>

      {/* ===== QUICK BOOKING DIALOG ===== */}
      <Dialog open={bookingOpen} onClose={() => setBookingOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '18px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' } }}>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          New Booking
          <IconButton onClick={() => setBookingOpen(false)}><X size={18} /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Pickup City</Typography>
              <TextField select size="small" fullWidth value={bkFrom} onChange={(e) => setBkFrom(e.target.value)} sx={{ mt: 0.5 }}>
                {CITY_ANCHORS.map(c => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}
              </TextField>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Destination City</Typography>
              <TextField select size="small" fullWidth value={bkTo} onChange={(e) => setBkTo(e.target.value)} sx={{ mt: 0.5 }}>
                {CITY_ANCHORS.map(c => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}
              </TextField>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Vehicle Type</Typography>
              <TextField select size="small" fullWidth value={bkType} onChange={(e) => setBkType(e.target.value)} sx={{ mt: 0.5 }}>
                {vehicleTypes.map(v => <MenuItem key={v.id} value={v.id}>{v.label} ({formatINR(v.perKm)}/km)</MenuItem>)}
              </TextField>
            </Box>
            <Box sx={{ p: 2, borderRadius: '14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Distance</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{bkDist} km</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Estimated Fare</Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>{formatINR(bkPrice.total)}</Typography>
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setBookingOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" sx={{ textTransform: 'none', bgcolor: 'var(--accent-indigo)' }} onClick={confirmBooking}>Confirm Booking</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ---- small helper subcomponents ---- */

function PriceBar({ label, val, color }) {
  const maxVal = 300;
  return (
    <Box sx={{ mb: 0.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
        <Typography variant="caption" sx={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</Typography>
        <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 700 }}>{formatINR(val)}</Typography>
      </Box>
      <Box sx={{ width: '100%', height: 4, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
        <Box sx={{ width: `${Math.min(100, (val / maxVal) * 100)}%`, height: '100%', borderRadius: 3, background: color }} />
      </Box>
    </Box>
  );
}

function Metric({ label, value, color }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 800, color }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{label}</Typography>
    </Box>
  );
}

function AreaSearch({ onSelect }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);

  const doSearch = async () => {
    if (!q.trim()) return;
    const locale = CITY_AREAS.filter(c => c.label.toLowerCase().includes(q.toLowerCase()));
    if (locale.length) {
      setResults(locale);
      return;
    }
    try {
      const g = await geocodingService.search(q);
      setResults((g || []).map(x => ({ id: x.label, label: x.label })));
    } catch {
      setResults(CITY_AREAS.filter(c => c.label.toLowerCase().includes(q.toLowerCase())));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 1 }}>
        <TextField size="small" fullWidth variant="outlined" placeholder="Search Indian city, e.g. 'Pune'…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doSearch()} sx={{ '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' } }} />
        <Button variant="contained" sx={{ bgcolor: 'var(--accent-indigo)', minWidth: 44, px: 1 }} onClick={doSearch}><Search size={16} /></Button>
      </Box>
      <Stack spacing={0.75}>
        {results.slice(0, 5).map(r => (
          <Button key={r.id} fullWidth variant="outlined" sx={{ textTransform: 'none', justifyContent: 'flex-start', color: 'var(--text-main)', borderColor: 'var(--border-color)', borderRadius: '10px' }}
            startIcon={<MapPin size={15} color="var(--accent-indigo)" />}
            onClick={() => { if (onSelect && CITY_ANCHORS.find(c => c.id === r.id)) onSelect(CITY_ANCHORS.find(c => c.id === r.id), CITY_ANCHORS[(CITY_ANCHORS.findIndex(c => c.id === r.id) + 1) % CITY_ANCHORS.length]); }}>
            {r.label}
          </Button>
        ))}
        {results.length === 0 && q && (
          <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>No matches. Try a city from the quick-cities list below.</Typography>
        )}
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {CITY_ANCHORS.map(c => (
            <Chip key={c.id} size="small" label={c.label} onClick={() => { setQ(c.label); setResults([{ id: c.id, label: c.label }]); }} sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: 'var(--accent-indigo)' }} />
          ))}
        </Box>
      </Stack>
    </Box>
  );
}
