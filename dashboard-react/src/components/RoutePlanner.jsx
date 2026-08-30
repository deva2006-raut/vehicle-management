import React, { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box, Card, TextField, Button, Typography, Chip, IconButton,
  CircularProgress, Alert, MenuItem, Select, InputLabel,
  FormControl, ListItem, Tooltip, Toolbar
} from '@mui/material';
import {
  LocateFixed, Plus, X, Route as RouteIcon,
  Clock, Gauge, IndianRupee, ArrowUp, ArrowDown,
  Navigation as NavIcon, Square, ChevronDown, ChevronUp, Layers,
  ListOrdered, StepForward
} from 'lucide-react';
import { geocodingService, CITY_AREAS } from '../services/geocodingService';
import { getRoutes, ROUTE_MODES } from '../services/routingService';
import { estimateTripCost, getVehicleTypes } from '../services/pricingService';
import { userService } from '../services/userService';

const INDIA_CENTER = [23.2, 79.5];
const INDIA_ZOOM = 5;

// Free tile providers with good Indian coverage + street labels.
const TILE_PROVIDERS = {
  streets: {
    label: 'Street Map', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
  },
  satellite: {
    label: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri', maxZoom: 18
  },
  terrain: {
    label: 'Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data &copy; OpenStreetMap, SRTM | OpenTopoMap', maxZoom: 17
  }
};

function makeRouteColor(i) {
  const palette = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];
  return palette[i % palette.length];
}

function makeStopIcon(label, color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font:700 12px/1 sans-serif;color:#fff;">${label}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13]
  });
}

// Parse OSRM legs into flat turn-by-turn steps.
function stepsFromLegs(legs) {
  const out = [];
  (legs || []).forEach(leg => {
    const have = (leg && leg.steps) || [];
    let legDist = 0;
    for (const s of have) {
      legDist += s.distance || 0;
      const maneuver = s.maneuver || {};
      const icon =
        { 'turn': '→', 'roundabout': '↻', 'exit': '→', 'arrive': '●', 'depart': '▲', 'merge': '⤳', 'continue': '↑', 'fork': '⤴' }[
          maneuver.type] || '→';
      out.push({
        name: s.name || (maneuver.type === 'arrive' ? 'Arrive' : 'Continue'),
        icon,
        instruction: (s.ref ? s.ref + ' ' : '') + (s.name || ''),
        distance: s.distance || 0,
        duration: s.duration || 0
      });
    }
    if (out.length) {
      const last = out[out.length - 1];
      last.legTotalM = legDist;
    }
  });
  return out;
}

function fmtMeters(m) {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

export default function RoutePlanner() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const baseLayer = useRef(null);
  const waypointLayer = useRef(null);
  const routeLayer = useRef(null);
  const searchTimer = useRef(null);

  const [waypoints, setWaypoints] = useState([
    { id: 'start', label: 'Start location', address: '', lat: null, lng: null },
    { id: 'dest', label: 'Destination', address: '', lat: null, lng: null }
  ]);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchIndex, setSearchIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState('fastest');
  const [excludeToll, setExcludeToll] = useState(false);
  const [excludeHighway, setExcludeHighway] = useState(false);
  const [vehicleType, setVehicleType] = useState('car');
  const [locating, setLocating] = useState(false);
  const [trips, setTrips] = useState([]);
  const [steps, setSteps] = useState([]);
  const [tileType, setTileType] = useState('streets');
  const [directionsOpen, setDirectionsOpen] = useState(true);
  const [showOptions, setShowOptions] = useState(false);
  const [recent, setRecent] = useState([]);
  const [navigating, setNavigating] = useState(false);

  // Google-Maps style container height (below the app topbar).
  const HGHT = 'calc(100vh - 64px)';

  // Create map once.
  useEffect(() => {
    const map = L.map(mapRef.current, { center: INDIA_CENTER, zoom: INDIA_ZOOM, zoomControl: true });
    baseLayer.current = L.tileLayer(TILE_PROVIDERS.streets.url, {
      attribution: TILE_PROVIDERS.streets.attribution, maxZoom: TILE_PROVIDERS.streets.maxZoom
    }).addTo(map);
    waypointLayer.current = L.layerGroup().addTo(map);
    routeLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    return () => map.remove();
  }, []);

  // Switch tile layer (streets / satellite / terrain) for detailed map labels.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (baseLayer.current) map.removeLayer(baseLayer.current);
    const p = TILE_PROVIDERS[tileType] || TILE_PROVIDERS.streets;
    baseLayer.current = L.tileLayer(p.url, { attribution: p.attribution, maxZoom: p.maxZoom }).addTo(map);
  }, [tileType]);

  // Map click adds a point.
  const handleMapClick = async (handler) => {
    const { lat, lng } = handler.latlng;
    const address = await geocodingService.reverse(lat, lng).catch(() => '');
    setWaypoints(prev => {
      const next = prev.slice();
      const dest = next[next.length - 1];
      if (!dest.lat) {
        next[next.length - 1] = { ...dest, address, lat, lng };
      } else {
        next.splice(next.length - 1, 0, { id: 'st' + Date.now(), label: 'Stop', address, lat, lng });
      }
      return next;
    });
  };

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    map.on('click', handleMapClick);
    return () => map.off('click', handleMapClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search.
  useEffect(() => {
    if (searchIndex === null) return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQuery.trim()) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(() => {
      setSearching(true);
      geocodingService
        .search(searchQuery, { city: areaFilter || undefined })
        .then(res => setSuggestions(res))
        .catch(() => setSuggestions([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [searchQuery, searchIndex, areaFilter]);

  const beginSearch = (idx) => { setSearchIndex(idx); setSearchQuery(''); setSuggestions([]); };

  const pickSuggestion = (place) => {
    setWaypoints(prev => {
      const next = prev.slice();
      next[searchIndex] = { ...next[searchIndex], address: place.label, lat: place.lat, lng: place.lng };
      return next;
    });
    setSuggestions([]);
    setSearchIndex(null);
  };

  // Reorder a waypoint (Google-Maps "reorder stops").
  const moveStop = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= waypoints.length) return;
    setWaypoints(prev => {
      const next = prev.slice();
      const [item] = next.splice(idx, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const addStop = () => {
    setWaypoints(prev => {
      const next = prev.slice();
      next.splice(next.length - 1, 0, { id: 'st' + Date.now(), label: 'Add stop', address: '', lat: null, lng: null });
      return next;
    });
  };

  const removeStop = (idx) => {
    if (waypoints.length <= 2) return;
    setWaypoints(prev => prev.filter((_, i) => i !== idx));
  };

  const clearTrip = () => {
    setWaypoints([
      { id: 'start', label: 'Start location', address: '', lat: null, lng: null },
      { id: 'dest', label: 'Destination', address: '', lat: null, lng: null }
    ]);
    setRoutes([]); setSelectedRoute(null); setSteps([]); setTrips([]); setNavigating(false);
  };

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) { setError('Geolocation is not supported by this browser.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const address = await geocodingService.reverse(latitude, longitude).catch(() => 'Current location');
        setWaypoints(prev => {
          const next = prev.slice();
          next[0] = { ...next[0], address, lat: latitude, lng: longitude };
          if (!next[next.length - 1].lat) next[next.length - 1] = { ...next[next.length - 1], label: 'Destination' };
          return next;
        });
        setLocating(false);
        const map = mapInstance.current;
        if (map) map.flyTo([latitude, longitude], 13);
      },
      (err) => { setLocating(false); setError('Unable to access current location: ' + (err.message || 'permission denied')); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Run routing.
  useEffect(() => {
    const pts = waypoints.filter(w => w.lat != null && w.lng != null).map(w => ({ lat: w.lat, lng: w.lng }));
    if (pts.length < 2) {
      setRoutes([]); setSelectedRoute(null); setSteps([]);
      if (routeLayer.current) routeLayer.current.clearLayers();
      return;
    }
    let cancelled = false;
    setLoading(true); setError('');
    getRoutes(pts, { mode, excludeToll, excludeHighway })
      .then(res => {
        if (cancelled) return;
        setRoutes(res);
        setSelectedRoute(res[0] || null);
        if (res.length) {
          setSteps(stepsFromLegs(res[0].steps));
          setTrips(res.map(r => ({
            route: r,
            price: estimateTripCost({ type: vehicleType, distanceKm: r.distanceKm, durationMin: r.durationMin, tollKm: r.tollKm })
          })));
        }
      })
      .catch(e => { if (cancelled) return; setError('Routing failed: ' + (e.message || 'unknown error')); setRoutes([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints, mode, excludeToll, excludeHighway, vehicleType]);

  // Save a completed trip to recent history (synced to the logged-in account).
  useEffect(() => {
    if (!selectedRoute) return;
    const from = waypoints.find(w => w.lat != null && w.lng != null);
    const to = waypoints.filter(w => w.lat != null && w.lng != null).pop();
    if (!from || !to || !from.address || !to.address) return;
    userService.addHistory({
      from: from.address.split(',')[0], to: to.address.split(',')[0],
      distanceKm: Math.round(selectedRoute.distanceKm), durationMin: Math.round(selectedRoute.durationMin)
    }).then(() => userService.me()).then(u => { if (u) setRecent((u.history || []).slice(0, 5)); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoute?.id]);

  // Draw markers + route (selected route emphasized, alternatives faint).
  useEffect(() => {
    const wl = waypointLayer.current;
    const rl = routeLayer.current;
    if (!wl || !rl) return;
    wl.clearLayers(); rl.clearLayers();
    const pts = waypoints.filter(w => w.lat != null && w.lng != null);
    pts.forEach((w, i) => {
      const color = i === 0 ? '#10b981' : i === pts.length - 1 ? '#f43f5e' : '#6366f1';
      const label = i === 0 ? 'A' : i === pts.length - 1 ? 'B' : String(i + 1);
      L.marker([w.lat, w.lng], { icon: makeStopIcon(label, color) })
        .bindPopup(`<b>${w.label}</b><br/>${w.address}`).addTo(wl);
    });
    routes.forEach((r, i) => {
      const coords = r.geometry.coordinates.map(c => [c[1], c[0]]);
      const selected = selectedRoute && r.id === selectedRoute.id;
      const pts2 = pts.length > 1;
      L.polyline(coords, {
        color: selected ? makeRouteColor(i) : makeRouteColor(i),
        weight: selected ? 6 : 3,
        opacity: selected ? 0.95 : 0.35,
        dashArray: selected ? null : '6 8'
      }).addTo(rl);
      void pts2;
    });
    if (pts.length > 1) {
      mapInstance.current.fitBounds(L.latLngBounds(pts.map(p => [p.lat, p.lng])), { padding: [60, 60] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints, routes, selectedRoute]);

  const sel = selectedRoute;
  const selTrip = trips.find(t => t.route.id === sel?.id);
  const liveSteps = navigating && steps.length ? steps : [];

  return (
    <Box sx={{ position: 'relative', height: HGHT, width: '100%', overflow: 'hidden' }}>
      {/* Full-height map background (Google-Maps style) */}
      <Box sx={{ position: 'absolute', inset: 0 }} ref={mapRef} />

      {/* --- Floating top-left: compact direction box --- */}
      <Card sx={{
        position: 'absolute', top: 14, left: 14, zIndex: 1000, width: { xs: '92%', sm: 340 },
        p: 1.5, borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(16, 22, 39, 0.92)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 34px rgba(0,0,0,0.5)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ display: 'inline-flex', p: 0.8, borderRadius: '10px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <RouteIcon size={16} color="white" />
          </Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, flex: 1 }}>Directions</Typography>
          <Tooltip title="Clear trip">
            <span><IconButton size="small" onClick={clearTrip}><X size={16} /></IconButton></span>
          </Tooltip>
        </Box>

        {/* Stacked A→B inputs (compact) */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {waypoints.map((w, idx) => (
            <Box key={w.id} sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Box sx={{ width: 18, textAlign: 'center', color: idx === 0 ? '#10b981' : idx === waypoints.length - 1 ? '#f43f5e' : '#6366f1' }}>
                {idx === 0 ? 'A' : idx === waypoints.length - 1 ? 'B' : String(idx + 1)}
              </Box>
              <TextField
                fullWidth size="small" value={searchIndex === idx ? searchQuery : w.address}
                placeholder={w.label}
                onFocus={() => beginSearch(idx)}
                onChange={(e) => { if (searchIndex !== idx) beginSearch(idx); setSearchQuery(e.target.value); }}
                sx={{ '& .MuiOutlinedInput-input': { py: 0.8, fontSize: 13.5 } }}
                InputProps={{
                  endAdornment: (
                    <Box sx={{ display: 'inline-flex' }}>
                      {idx > 0 && idx < waypoints.length - 1 && (
                        <IconButton size="small" onClick={() => removeStop(idx)}><X size={13} /></IconButton>
                      )}
                      <IconButton size="small" onClick={() => moveStop(idx, -1)} disabled={idx === 0}><ArrowUp size={13} /></IconButton>
                      <IconButton size="small" onClick={() => moveStop(idx, 1)} disabled={idx === waypoints.length - 1}><ArrowDown size={13} /></IconButton>
                    </Box>
                  )
                }}
              />
            </Box>
          ))}
        </Box>

        {/* Area filter + add stop row */}
        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', mt: 0.75 }}>
          <Button size="small" onClick={addStop} startIcon={<Plus size={13} />} sx={{ textTransform: 'none', fontSize: 12.5, whiteSpace: 'nowrap' }}>Add stop</Button>
          {searchIndex !== null && (
            <TextField select size="small" fullWidth value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}
              sx={{ '& .MuiOutlinedInput-input': { py: 0.6, fontSize: 12.5 } }}>
              <MenuItem value=""><em>All India</em></MenuItem>
              {CITY_AREAS.map(c => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}
            </TextField>
          )}
        </Box>

        {/* Suggestions dropdown */}
        {searchIndex !== null && (
          <Box sx={{ mt: 1, maxHeight: 170, overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
            {searching && <Typography variant="caption" sx={{ p: 1, display: 'block' }}>Searching…</Typography>}
            {suggestions.map(s => (
              <ListItem key={s.id} button onClick={() => pickSuggestion(s)} sx={{ py: 0.6, px: 1.5 }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{s.name}</Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.address}</Typography>
                </Box>
              </ListItem>
            ))}
            {!searching && suggestions.length === 0 && !searchQuery && (
              <Typography variant="caption" sx={{ p: 1, display: 'block', fontSize: 12 }}>Type to search, or click the map.</Typography>
            )}
          </Box>
        )}

        {/* Options toggles */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Options</Typography>
          <IconButton size="small" onClick={() => setShowOptions(v => !v)}>
            {showOptions ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </IconButton>
        </Box>
        {showOptions && (
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Mode</InputLabel>
                <Select value={mode} label="Mode" onChange={(e) => setMode(e.target.value)} sx={{ fontSize: 13 }}>
                  {Object.entries(ROUTE_MODES).map(([id, m]) => <MenuItem key={id} value={id}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Vehicle</InputLabel>
                <Select value={vehicleType} label="Vehicle" onChange={(e) => setVehicleType(e.target.value)} sx={{ fontSize: 13 }}>
                  {getVehicleTypes().map(v => <MenuItem key={v.id} value={v.id}>{v.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <Chip size="small" label="Avoid Toll" onClick={() => setExcludeToll(v => !v)} color={excludeToll ? 'primary' : 'default'} variant={excludeToll ? 'filled' : 'outlined'} />
              <Chip size="small" label="Avoid Highway" onClick={() => setExcludeHighway(v => !v)} color={excludeHighway ? 'primary' : 'default'} variant={excludeHighway ? 'filled' : 'outlined'} />
            </Box>
            {error && <Alert severity="error" sx={{ fontSize: 12.5, py: 0.5 }}>{error}</Alert>}
            {loading && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 12.5, color: 'var(--text-muted)' }}><CircularProgress size={14} /> Routing…</Box>}
          </Box>
        )}
      </Card>

      {/* --- Floating top-right: map layers + locate --- */}
      <Card sx={{ position: 'absolute', top: 14, right: 14, zIndex: 1000, p: 0.5, borderRadius: '14px', background: 'rgba(16,22,39,0.9)' }}>
        <Toolbar disableGutters sx={{ minHeight: 0, flexDirection: 'column', px: 0.5 }}>
          <Tooltip title="Use current location">
            <span><IconButton size="small" onClick={useCurrentLocation}>{locating ? <CircularProgress size={16} /> : <LocateFixed size={16} />}</IconButton></span>
          </Tooltip>
          <Tooltip title="Map style">
            <span><IconButton size="small" onClick={() => { const o = ['streets', 'satellite', 'terrain']; setTileType(o[(o.indexOf(tileType) + 1) % 3]); }}><Layers size={16} /></IconButton></span>
          </Tooltip>
          <Typography variant="caption" sx={{ fontSize: 9, color: 'var(--text-muted)' }}>{TILE_PROVIDERS[tileType].label}</Typography>
        </Toolbar>
      </Card>

      {/* --- Left: floating directions / steps panel (Google-Maps style) --- */}
      {sel && selTrip && (
        <Card sx={{
          position: 'absolute', top: 14, left: { xs: 14, sm: 372 }, bottom: 74, zIndex: 1000,
          width: { xs: '92%', sm: 360 }, p: 0, borderRadius: '18px', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          background: 'rgba(16,22,39,0.92)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {/* Summary header */}
          <Box sx={{ p: 1.75, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Route</Typography>
              <IconButton size="small" onClick={() => setDirectionsOpen(v => !v)}>
                {directionsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 0.75 }}>
              <Chip size="small" icon={<Clock size={13} />} label={sel.durationText} />
              <Chip size="small" icon={<Gauge size={13} />} label={sel.distanceKm >= 1000 ? `${(sel.distanceKm / 1000).toFixed(1)}k km` : `${Math.round(sel.distanceKm)} km`} />
              <Chip size="small" icon={<IndianRupee size={13} />} label={`${selTrip.price.total}`} />
              <Chip size="small" label={`Score ${selTrip.route.score}/100`} color="success" variant="outlined" />
            </Box>
            {navigating ? (
              <Button fullWidth size="small" variant="contained" color="error" startIcon={<Square size={14} />} onClick={() => setNavigating(false)} sx={{ textTransform: 'none', borderRadius: '10px' }}>
                End navigation
              </Button>
            ) : (
              <Button fullWidth size="small" variant="contained" startIcon={<NavIcon size={14} />} onClick={() => setNavigating(true)} sx={{ textTransform: 'none', borderRadius: '10px', background: 'linear-gradient(135deg,#10b981,#059669)', '&:hover': { background: 'linear-gradient(135deg,#059669,#047857)' } }}>
                Start navigation
              </Button>
            )}
          </Box>

          {directionsOpen && (
            <Box sx={{ overflow: 'auto', flex: 1, p: 1.5 }}>
              {/* Alternate routes comparison */}
              {trips.length > 1 && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 12.5, mb: 0.75 }}>Compare routes</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6, mb: 1.5 }}>
                    {trips.map(t => (
                      <Box key={t.route.id} onClick={() => setSelectedRoute(t.route)} sx={{
                        p: 1, borderRadius: '10px', cursor: 'pointer',
                        border: t.route.id === sel.id ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                        background: t.route.id === sel.id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)'
                      }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12.5 }}>
                            {t.route.distanceKm >= 1000 ? `${(t.route.distanceKm / 1000).toFixed(1)}k km` : `${Math.round(t.route.distanceKm)} km`} · {t.route.durationText}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>₹{t.price.total}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.25, fontSize: 11, color: 'var(--text-muted)' }}>
                          <span>Toll ₹{t.price.breakdown.tollCharge}</span>
                          <span>Fuel ₹{t.price.breakdown.fuelCharge}</span>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              {/* Preferred + toll info */}
              <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', mb: 1.5 }}>
                Estimated toll ₹{selTrip.price.breakdown.tollCharge} · Fuel ₹{selTrip.price.breakdown.fuelCharge} ({selTrip.price.fuelLitres} L)
              </Typography>

              {/* Turn-by-turn steps */}
              {steps.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 12.5, mb: 0.75, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <ListOrdered size={14} /> Turn-by-turn
                  </Typography>
                  <Box>
                    {steps.map((s, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', py: 0.55, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <Box sx={{ width: 22, textAlign: 'center', color: '#a5b4fc', fontSize: 14 }}>{s.icon}</Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 500 }}>{s.instruction || s.name}</Typography>
                          <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: 11 }}>{fmtMeters(s.distance)}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
              {steps.length === 0 && <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Step details aren’t available for this route.</Typography>}
            </Box>
          )}
        </Card>
      )}

      {/* --- Floating bottom: live navigation bar --- */}
      {liveSteps.length > 0 && (
        <Card sx={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
          width: { xs: '94%', sm: 560 }, p: 1.5, borderRadius: '18px',
          background: 'rgba(10,15,28,0.95)', backdropFilter: 'blur(10px)', border: '1px solid #10b98166',
          boxShadow: '0 12px 40px rgba(16,185,129,0.25)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'inline-flex', p: 1.4, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white' }}>
              <NavIcon size={22} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                {sel.durationText} remaining
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
                {sel.distanceKm >= 1000 ? `${(sel.distanceKm / 1000).toFixed(1)}k km` : `${Math.round(sel.distanceKm)} km`} · {liveSteps[0].instruction || liveSteps[0].name}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#10b981', fontSize: 13 }}>Now</Typography>
          </Box>
          <Box sx={{ mt: 1, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,#10b981,#34d399)', width: '100%' }} />
          </Box>
        </Card>
      )}

      {/* --- Bottom-left: contextual hint / recent --- */}
      {!sel && (
        <Card sx={{
          position: 'absolute', bottom: 12, left: 14, zIndex: 1000, p: 1.5, borderRadius: '16px',
          background: 'rgba(16,22,39,0.9)', border: '1px dashed rgba(255,255,255,0.14)',
          maxWidth: 300
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--text-muted)' }}>
            <StepForward size={15} color="#818cf8" />
            <Typography variant="body2" sx={{ fontSize: 12.5 }}>
              Set start &amp; destination, or click the map to add points.
            </Typography>
          </Box>
          {recent.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>Recent</Typography>
              {recent.map((h, i) => (
                <Typography key={i} variant="caption" sx={{ display: 'block', color: 'var(--text-muted)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.from} → {h.to}
                </Typography>
              ))}
            </Box>
          )}
        </Card>
      )}
    </Box>
  );
}
