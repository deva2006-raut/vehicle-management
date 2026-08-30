import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Card, Chip, Avatar, LinearProgress, Stack, Grid,
  TextField, MenuItem, Button, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow
} from '@mui/material';
import {
  Wrench, Fuel, Package, Trophy, Medal, Phone, ArrowLeftRight,
  Route, Timer, Banknote, Zap
} from 'lucide-react';
import { getVehicleTypes } from '../services/pricingService';
import { CITY_AREAS } from '../services/geocodingService';
import { CITY_ANCHORS as CITY_ANCHORS_DEFAULT, formatINR } from '../services/transportService';

const vehicleTypes = getVehicleTypes();

function PanelHeader({ icon, title, subtitle, action }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 36, height: 36, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(99,102,241,0.12)', color: 'var(--accent-indigo)' }}>{icon}</Box>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
          {subtitle && <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{subtitle}</Typography>}
        </Box>
      </Box>
      {action}
    </Box>
  );
}

const statusChipColor = (s) => s === 'maintenance' ? '#64748b' : s === 'delayed' ? '#f59e0b' : s === 'in-transit' ? '#3b82f6' : s === 'active' ? '#10b981' : '#94a3b8';

function Gauge({ value, color }) {
  return (
    <Box sx={{ position: 'relative', width: 54, height: 54 }}>
      <Box sx={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `conic-gradient(${color} ${value * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }} />
      <Box sx={{ position: 'absolute', inset: 7, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="caption" sx={{ fontWeight: 800, fontSize: 12 }}>{Math.round(value)}</Typography>
      </Box>
    </Box>
  );
}

export function VehicleHealthPanel({ health }) {
  return (
    <Card sx={{ p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
      <PanelHeader icon={<Wrench size={17} />} title="Fleet Health" subtitle="Service due, fuel & load" />
      <Stack spacing={1.25}>
        {health.map(h => {
          const meta = h.health >= 85 ? { label: 'Excellent', color: '#10b981' } : h.health >= 70 ? { label: 'Good', color: '#3b82f6' } : h.health >= 55 ? { label: 'Fair', color: '#f59e0b' } : { label: 'Needs Service', color: '#f43f5e' };
          return (
            <Box key={h.id} sx={{ p: 1.5, borderRadius: '14px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Gauge value={h.health} color={meta.color} />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{h.name}</Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{h.type} · {h.number}</Typography>
                  </Box>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Chip size="small" label={meta.label} sx={{ bgcolor: meta.color + '22', color: meta.color, fontSize: 10, fontWeight: 700 }} />
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', mt: 0.5 }}>{h.status}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <MiniBar icon={<Fuel size={13} />} label="Fuel" val={h.fuelPct} color={h.fuelPct < 25 ? '#f43f5e' : '#10b981'} />
                <MiniBar icon={<Package size={13} />} label="Load" val={h.loadPct} color="#6366f1" />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Timer size={13} color={h.serviceDueDays <= 3 ? '#f59e0b' : 'var(--text-muted)'} />
                  <Typography variant="caption" sx={{ color: h.serviceDueDays <= 3 ? '#f59e0b' : 'var(--text-muted)', fontWeight: 600 }}>
                    {h.serviceDueDays === 0 ? 'Due now' : `${h.serviceDueDays}d to service`}
                  </Typography>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Card>
  );
}

function MiniBar({ icon, label, val, color }) {
  return (
    <Box sx={{ minWidth: 90, flex: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <Box sx={{ color: 'var(--text-muted)' }}>{icon}</Box>
        <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{label} {Math.round(val)}%</Typography>
      </Box>
      <LinearProgress variant="determinate" value={val} sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: color } }} />
    </Box>
  );
}

export function DriverLeaderboard({ standings }) {
  const medals = [<Trophy size={18} color="#f59e0b" />, <Medal size={18} color="#94a3b8" />, <Medal size={18} color="#b45309" />];
  const total = standings.reduce((s, d) => s + d.score, 0) || 1;
  return (
    <Card sx={{ p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
      <PanelHeader icon={<Trophy size={17} />} title="Driver Leaderboard" subtitle="Live performance standings" />
      <Stack spacing={1}>
        {standings.slice(0, 6).map((d, i) => (
          <Box key={i} sx={{ p: 1.5, borderRadius: '12px', border: i === 0 ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border-color)', background: i === 0 ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 22, textAlign: 'center' }}>{medals[i] || <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontWeight: 700 }}>#{i + 1}</Typography>}</Box>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'var(--accent-indigo)', fontSize: 14 }}>{d.name.charAt(0)}</Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{d.name}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: d.score >= 85 ? 'var(--accent-emerald)' : 'var(--accent-indigo)' }}>{d.score}</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>{d.trips} trips</Typography>
                <Typography variant="caption" sx={{ color: '#10b981' }}>{d.onTime} on-time</Typography>
                {d.delayed > 0 && <Typography variant="caption" sx={{ color: '#f59e0b' }}>{d.delayed} delayed</Typography>}
              </Box>
              <LinearProgress variant="determinate" value={(d.score / total) * 100} sx={{ height: 5, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)', '& .MuiLinearProgress-bar': { bgcolor: i === 0 ? '#f59e0b' : 'var(--accent-indigo)' } }} />
            </Box>
            <Phone size={15} color="var(--text-muted)" />
          </Box>
        ))}
      </Stack>
    </Card>
  );
}

export function CityRouteOptimizer({ onBook }) {
  const [from, setFrom] = useState(CITY_ANCHORS_DEFAULT[0].id);
  const [to, setTo] = useState(CITY_ANCHORS_DEFAULT[1].id);
  const [type, setType] = useState('truck');

  const route = useMemo(() => {
    const a = CITY_AREAS.find(c => c.id === from);
    const b = CITY_AREAS.find(c => c.id === to);
    if (!a || !b || a.id === b.id) return null;
    const sel = CITY_ANCHORS_DEFAULT.find(c => c.id === from);
    const t2 = CITY_ANCHORS_DEFAULT.find(c => c.id === to);
    if (!sel || !t2) return null;
    const dLat = sel.coord[0] - t2.coord[0];
    const dLng = sel.coord[1] - t2.coord[1];
    const straightKm = Math.hypot(dLat, dLng) * 111;
    const distanceKm = Math.round(straightKm * 1.25);
    const durationMin = Math.round(distanceKm * 1.7);
    const tollKm = Math.round(distanceKm * 0.6);
    const vt = vehicleTypes.find(v => v.id === type) || vehicleTypes[0];
    return {
      distanceKm, durationMin, tollKm,
      durationText: `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`,
      totalCost: Math.round(vt.base + distanceKm * vt.perKm + tollKm * 4 + distanceKm * vt.fuelPerKm * 0.001 * 100),
      fuelCost: Math.round((distanceKm * vt.fuelPerKm / 100) * 100),
      tollCost: Math.round(tollKm * 4),
      vtLabel: vt.label
    };
  }, [from, to, type]);

  return (
    <Card sx={{ p: 2, borderRadius: '18px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
      <PanelHeader icon={<Zap size={17} />} title="City Route Optimizer" subtitle="Compare inter-city cost, distance & toll" />
      <Grid container spacing={1.5}>
        <Grid item xs={6}>
          <TextField select size="small" fullWidth label="From" value={from} onChange={(e) => setFrom(e.target.value)}>
            {CITY_ANCHORS_DEFAULT.map(c => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={6}>
          <TextField select size="small" fullWidth label="To" value={to} onChange={(e) => setTo(e.target.value)}>
            {CITY_ANCHORS_DEFAULT.map(c => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12}>
          <TextField select size="small" fullWidth label="Vehicle" value={type} onChange={(e) => setType(e.target.value)}>
            {vehicleTypes.map(v => <MenuItem key={v.id} value={v.id}>{v.label}</MenuItem>)}
          </TextField>
        </Grid>
      </Grid>

      {route ? (
        <Box sx={{ mt: 2, p: 2, borderRadius: '14px', border: '1px solid var(--border-color)', background: 'rgba(99,102,241,0.06)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <ArrowLeftRight size={16} color="var(--accent-indigo)" />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{from.toUpperCase()} → {to.toUpperCase()}</Typography>
          </Box>
          <Grid container spacing={1.5}>
            <RouteStat icon={<Route size={15} />} label="Distance" value={`${route.distanceKm} km`} />
            <RouteStat icon={<Timer size={15} />} label="Duration" value={route.durationText} />
            <RouteStat icon={<Banknote size={15} />} label="Tolls" value={formatINR(route.tollCost)} />
          </Grid>
          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Estimated ({route.vtLabel})</Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>{formatINR(route.totalCost)}</Typography>
            </Box>
            <Button variant="contained" size="small" startIcon={<ArrowLeftRight size={14} />} sx={{ textTransform: 'none', bgcolor: 'var(--accent-indigo)' }}
              onClick={() => onBook && onBook(from, to, type)}>
              Book
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: 'var(--text-muted)', mt: 2 }}>Choose two different cities.</Typography>
      )}
    </Card>
  );
}

function RouteStat({ icon, label, value }) {
  return (
    <Grid item xs={4}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'var(--text-muted)' }}>{icon}<Typography variant="caption">{label}</Typography></Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{value}</Typography>
    </Grid>
  );
}
