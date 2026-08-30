import React, { useRef, useEffect, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box, Card, IconButton, Tooltip, Typography, Chip, Button,
  TextField, CircularProgress
} from '@mui/material';
import {
  Search, LocateFixed, Maximize2, Layers, Phone, Route, Truck
} from 'lucide-react';
import { geocodingService } from '../services/geocodingService';
import { FLEET_STATUS } from '../services/transportService';

const INDIA_CENTER = [23.2, 79.5];
const INDIA_ZOOM = 5;

const TILES = {
  streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};

function statusColor(status) {
  return (FLEET_STATUS[status] || FLEET_STATUS.offline).color;
}

function makeBusIcon(status) {
  const c = statusColor(status);
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${c};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font:700 13px/1 sans-serif;color:#fff;">🚚</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

// Interpolate a "current" position part-way between pickup and drop for active trips so the
// marker sits on the route (grounded in the trip's real endpoints, no fabricated GPS).
function currentPos(t) {
  if (t.status === 'Delivered' || t.status === 'Scheduled') {
    return [t.pickupLat, t.pickupLng];
  }
  const f = 0.4;
  return [t.pickupLat + (t.dropLat - t.pickupLat) * f, t.pickupLng + (t.dropLng - t.pickupLng) * f];
}

export default function DashboardMap({ trips, height = 480, onSelectVehicle }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const baseLayer = useRef(null);
  const layer = useRef(null);
  const routeLayer = useRef(null);

  const [tileType, setTileType] = useState('streets');
  const [locating, setLocating] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  // init map
  useEffect(() => {
    const map = L.map(mapRef.current, { center: INDIA_CENTER, zoom: INDIA_ZOOM, zoomControl: true });
    baseLayer.current = L.tileLayer(TILES.streets, { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
    layer.current = L.layerGroup().addTo(map);
    routeLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (baseLayer.current) map.removeLayer(baseLayer.current);
    const url = tileType === 'streets' ? TILES.streets : TILES.satellite;
    baseLayer.current = L.tileLayer(url, {
      attribution: tileType === 'streets' ? '&copy; OpenStreetMap contributors' : '&copy; Esri, Maxar',
      maxZoom: 19
    }).addTo(map);
  }, [tileType]);

  // Draw markers + routes
  useEffect(() => {
    const map = mapInstance.current;
    const lyr = layer.current;
    const rl = routeLayer.current;
    if (!map || !lyr || !rl) return;
    lyr.clearLayers(); rl.clearLayers();

    const points = [];

    trips.forEach(t => {
      const pos = currentPos(t);
      points.push(L.latLng(pos[0], pos[1]));
      points.push(L.latLng(t.pickupLat, t.pickupLng));
      points.push(L.latLng(t.dropLat, t.dropLng));

      // vehicle marker
      const m = L.marker(L.latLng(pos[0], pos[1]), { icon: makeBusIcon(t.status) }).addTo(lyr);
      const meta = FLEET_STATUS[t.status] || FLEET_STATUS.offline;
      m.bindPopup(`
        <div style="min-width:220px;font-size:13px;color:#0f172a;font-family:inherit;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <b style="font-size:14px;">${t.vehicle}</b>
          </div>
          <div style="color:#64748b;margin-bottom:8px;">${t.vehicleType} · ${t.vehicleNumber}</div>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="color:#64748b;padding:2px 0;">Driver</td><td style="text-align:right;">${t.driver}</td></tr>
            <tr><td style="color:#64748b;padding:2px 0;">Phone</td><td style="text-align:right;">${t.driverPhone || '—'}</td></tr>
            <tr><td style="color:#64748b;padding:2px 0;">Current</td><td style="text-align:right;">en route</td></tr>
            <tr><td style="color:#64748b;padding:2px 0;">Trip</td><td style="text-align:right;">${t.id}</td></tr>
            <tr><td style="color:#64748b;padding:2px 0;">Destination</td><td style="text-align:right;">${t.destination}</td></tr>
            <tr><td style="color:#64748b;padding:2px 0;">ETA</td><td style="text-align:right;">${t.eta}</td></tr>
            <tr><td style="color:#64748b;padding:2px 0;">Distance left</td><td style="text-align:right;">${t.distanceKm} km</td></tr>
          </table>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">
            <span style="background:${meta.color};color:#fff;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;">${meta.label}</span>
          </div>
        </div>
      `);
      m.on('click', () => { setSelected(t); if (onSelectVehicle) onSelectVehicle(t); });

      // pickup & drop markers
      const pickupIcon = L.divIcon({ className: '', html: '<div style="width:14px;height:14px;border-radius:50%;background:#10b981;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
      const dropIcon = L.divIcon({ className: '', html: '<div style="width:14px;height:14px;border-radius:50%;background:#f43f5e;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });
      L.marker(L.latLng(t.pickupLat, t.pickupLng), { icon: pickupIcon }).addTo(lyr);
      L.marker(L.latLng(t.dropLat, t.dropLng), { icon: dropIcon }).addTo(lyr);

      // route line (active trips)
      if (t.status === 'In Transit' || t.status === 'Delayed' || t.status === 'Assigned') {
        L.polyline([L.latLng(t.pickupLat, t.pickupLng), L.latLng(pos[0], pos[1]), L.latLng(t.dropLat, t.dropLng)], {
          color: t.color || '#6366f1', weight: 3, opacity: 0.6, dashArray: '6 6'
        }).addTo(rl);
      }
    });

    if (points.length) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 10 });
    }
  }, [trips, onSelectVehicle]);

  const locate = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { if (mapInstance.current) mapInstance.current.flyTo([p.coords.latitude, p.coords.longitude], 13); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const fitAll = useCallback(() => {
    const map = mapInstance.current; const lyr = layer.current;
    if (!map || !lyr) return;
    const pts = [];
    lyr.eachLayer(leaf => { const ll = leaf.getLatLng && leaf.getLatLng(); if (ll) pts.push(ll); });
    if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 10 });
  }, []);

  const doSearch = async () => {
    if (!search.trim()) return;
    try {
      const res = await geocodingService.search(search);
      if (res && res.length) {
        const p = res[0];
        if (mapInstance.current) mapInstance.current.flyTo([p.lat, p.lng], 13);
      }
    } catch { /* silently ignore geocoding failures */ }
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height, borderRadius: '18px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%', backgroundColor: '#101827' }} />

      {/* search */}
      <Card sx={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, p: 0.5, borderRadius: '12px', background: 'rgba(16,22,39,0.92)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton size="small" onClick={doSearch}><Search size={15} /></IconButton>
        <TextField
          size="small" variant="standard" value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          placeholder="Search location…"
          InputProps={{ disableUnderline: true }}
          sx={{ '& input': { fontSize: 13, py: 0.75, color: 'var(--text-main)' } }}
        />
      </Card>

      {/* controls */}
      <Card sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, p: 0.5, borderRadius: '12px', background: 'rgba(16,22,39,0.92)', display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        <Tooltip title="My location"><span><IconButton size="small" onClick={locate}>{locating ? <CircularProgress size={15} /> : <LocateFixed size={15} />}</IconButton></span></Tooltip>
        <Tooltip title="Fit all vehicles"><span><IconButton size="small" onClick={fitAll}><Maximize2 size={15} /></IconButton></span></Tooltip>
        <Tooltip title="Toggle map/satellite"><span><IconButton size="small" onClick={() => setTileType(t => t === 'streets' ? 'satellite' : 'streets')}><Layers size={15} /></IconButton></span></Tooltip>
        <Typography variant="caption" sx={{ fontSize: 9, textAlign: 'center', color: 'var(--text-muted)' }}>{tileType === 'streets' ? 'Street' : 'Satellite'}</Typography>
      </Card>

      {/* legend */}
      <Card sx={{ position: 'absolute', bottom: 12, right: 12, zIndex: 1000, p: 1, borderRadius: '12px', background: 'rgba(16,22,39,0.9)' }}>
        {Object.entries(FLEET_STATUS).map(([k, v]) => (
          <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.6, py: 0.15 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: v.color }} />
            <Typography variant="caption" sx={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.label}</Typography>
          </Box>
        ))}
      </Card>

      {/* selected vehicle action card */}
      {selected && (
        <Card sx={{ position: 'absolute', bottom: 12, left: 12, zIndex: 1000, p: 1.25, borderRadius: '14px', width: 300, background: 'rgba(16,22,39,0.95)', border: '1px solid var(--border-color)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
            <Truck size={16} color={statusColor(selected.status)} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{selected.vehicle}</Typography>
            <Chip size="small" label={selected.vehicleNumber} sx={{ height: 20, fontSize: 10 }} variant="outlined" />
          </Box>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', mb: 1 }}>
            {selected.driver} · {selected.distanceKm} km to {selected.destination}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Button size="small" variant="contained" startIcon={<Route size={13} />} sx={{ textTransform: 'none', fontSize: 11 }}>Track</Button>
            <Button size="small" variant="outlined" startIcon={<Truck size={13} />} sx={{ textTransform: 'none', fontSize: 11 }}>View Trip</Button>
            <Button size="small" variant="outlined" startIcon={<Phone size={13} />} sx={{ textTransform: 'none', fontSize: 11 }}>Call</Button>
          </Box>
        </Card>
      )}
    </Box>
  );
}
