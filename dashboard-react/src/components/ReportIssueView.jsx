import React, { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Box, Card, Typography, TextField, Button, Chip, IconButton,
  CircularProgress, Alert, MenuItem, Select, InputLabel, FormControl
} from '@mui/material';
import {
  TriangleAlert, MapPin, Plus, X, AlertTriangle, CheckCircle2, Heart, RefreshCw
} from 'lucide-react';
import {
  roadReportsService, REPORT_TYPES, REPORT_TYPE_IDS, REPORT_STATUS
} from '../services/roadReportsService';

const INDIA_CENTER = [23.2, 79.5];
const INDIA_ZOOM = 5;
const HGHT = 'calc(100vh - 64px)';

function statusIcon(s) {
  if (s === 'investigating') return <RefreshCw size={15} />;
  if (s === 'resolved') return <CheckCircle2 size={15} />;
  return <AlertTriangle size={15} />;
}

export default function ReportIssueView() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const baseLayer = useRef(null);
  const markerLayer = useRef(null);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Report form state
  const [reportType, setReportType] = useState('pothole');
  const [description, setDescription] = useState('');
  const [pickPoint, setPickPoint] = useState(false);
  const [selected, setSelected] = useState(null);
  const [live, setLive] = useState(null); // location chosen on map
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Create map once.
  useEffect(() => {
    const map = L.map(mapRef.current, { center: INDIA_CENTER, zoom: INDIA_ZOOM, zoomControl: true });
    baseLayer.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19
    }).addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);
    mapInstance.current = map;
    return () => map.remove();
  }, []);

  // Load reports.
  const loadReports = useCallback(() => {
    setLoading(true); setError('');
    roadReportsService.list({ type: typeFilter || undefined, status: statusFilter || undefined })
      .then(rs => setReports(rs))
      .catch(e => setError('Could not load reports: ' + (e.message || 'network error')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter]);

  useEffect(() => { loadReports(); }, [loadReports]);

  // Keep picking mode in sync.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    if (pickPoint) map.getContainer().style.cursor = 'crosshair';
    else map.getContainer().style.cursor = '';
    return () => { if (map) map.getContainer().style.cursor = ''; };
  }, [pickPoint]);

  // Map click handler for picking the location.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const onCk = (e) => {
      if (!pickPoint) return;
      const { lat, lng } = e.latlng;
      setLive({ lat: Math.round(lat * 100000) / 100000, lng: Math.round(lng * 100000) / 100000 });
      map.flyTo([lat, lng], Math.max(map.getZoom(), 13));
      setPickPoint(false);
    };
    map.on('click', onCk);
    return () => map.off('click', onCk);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickPoint]);

  // Draw report markers.
  useEffect(() => {
    const layer = markerLayer.current;
    if (!layer || !mapInstance.current) return;
    layer.clearLayers();

    const mk = L.divIcon({
      className: '', iconSize: [30, 30], iconAnchor: [15, 30],
      html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#161b2b;border:2px solid #6366f1;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.45);"><span style="transform:rotate(45deg);font-size:16px;line-height:1;">${'📍'}</span></div>`
    });

    reports.forEach(r => {
      const meta = REPORT_TYPES[r.type] || REPORT_TYPES.pothole;
      const badge = L.divIcon({
        className: '', iconSize: [26, 26], iconAnchor: [13, 13],
        html: `<div style="width:26px;height:26px;border-radius:50%;background:${meta.color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;font:800 13px/1 sans-serif;color:#fff;">${meta.icon}</div>`
      });
      const p = L.marker([r.lat, r.lng], { icon: badge }).addTo(layer);
      const st = REPORT_STATUS[r.status] || REPORT_STATUS.open;
      p.bindPopup(
        `<div style="min-width:200px;font-size:13px;color:#0f172a;">` +
        `<b>${meta.icon} ${meta.label}</b><br/>` +
        (r.description ? `<span style="color:#334155;">${r.description}</span><br/>` : '') +
        `<span style="color:#64748b;">Reported by ${r.reportedBy || 'Anonymous'}</span><br/>` +
        `<span style="color:#64748b;">${new Date(r.createdAt).toLocaleDateString()}</span> &middot; ` +
        `<span style="color:${st.color};font-weight:600;">${st.label}</span>` +
        `</div>`
      );
      p.on('click', () => setSelected(r));
    });

    // Blinking placeholder for a "not yet placed" location pick.
    if (live && !reports.some(r => r.lat === live.lat && r.lng === live.lng)) {
      L.marker([live.lat, live.lng], { icon: mk }).addTo(layer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, live]);

  const submitReport = async () => {
    if (!live) { setError('Please tap the map to pin the location.'); return; }
    if (!description.trim()) { setError('Please add a short description.'); return; }
    setSaving(true); setError(''); setSuccess('');
    try {
      const created = await roadReportsService.create({
        type: reportType, lat: live.lat, lng: live.lng, description: description.trim()
      });
      setReports(prev => [created, ...prev]);
      setSuccess('Report submitted. Thank you for helping the community!');
      setLive(null); setDescription(''); setPickPoint(false); setShowForm(false);
    } catch (e) {
      setError(e.message || 'Could not submit report.');
    } finally {
      setSaving(false);
    }
  };

  const setResolved = async (r) => {
    try {
      const updated = await roadReportsService.updateStatus(r.id, 'resolved');
      setReports(prev => prev.map(x => x.id === updated.id ? updated : x));
      setSelected(null);
    } catch (e) {
      setError(e.message || 'Could not update report.');
    }
  };

  const startReport = () => {
    setShowForm(true); setLive(null); setPickPoint(true); setError('');
    setSuccess('');
  };

  return (
    <Box sx={{ position: 'relative', height: HGHT, width: '100%', overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', inset: 0 }} ref={mapRef} />

      {/* Floating top-left: report panel */}
      <Card sx={{
        position: 'absolute', top: 14, left: 14, zIndex: 1000, width: { xs: '92%', sm: 350 },
        borderRadius: '18px', border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(16,22,39,0.94)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 34px rgba(0,0,0,0.5)', p: 1.5
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
          <Box sx={{ display: 'inline-flex', p: 0.8, borderRadius: '10px', background: 'linear-gradient(135deg,#f43f5e,#ef4444)' }}>
            <TriangleAlert size={16} color="white" />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1 }}>Road Problem Reports</Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-muted)', fontSize: 11 }}>Community-reported issues on the map</Typography>
          </Box>
        </Box>

        {success && <Alert severity="success" sx={{ mb: 1.25, fontSize: 12.5, py: 0.5 }}>{success}</Alert>}

        {!showForm ? (
          <>
            <Box sx={{ display: 'flex', gap: 0.75, mb: 1 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)} sx={{ fontSize: 12.5 }}>
                  <MenuItem value=""><em>All types</em></MenuItem>
                  {REPORT_TYPE_IDS.map(t => <MenuItem key={t} value={t}>{REPORT_TYPES[t].icon} {REPORT_TYPES[t].label}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)} sx={{ fontSize: 12.5 }}>
                  <MenuItem value=""><em>All statuses</em></MenuItem>
                  {Object.entries(REPORT_STATUS).map(([k, s]) => <MenuItem key={k} value={k}>{s.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>

            <Button
              fullWidth variant="contained" size="small" startIcon={<Plus size={15} />}
              onClick={startReport}
              sx={{ textTransform: 'none', borderRadius: '10px', background: 'linear-gradient(135deg,#f43f5e,#ef4444)', '&:hover': { background: 'linear-gradient(135deg,#e11d48,#dc2626)' } }}
            >
              Report a problem
            </Button>

            {loading && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25, fontSize: 12.5, color: 'var(--text-muted)' }}><CircularProgress size={14} /> Loading reports…</Box>}
            {error && <Alert severity="error" sx={{ mt: 1.25, fontSize: 12.5, py: 0.5 }}>{error}</Alert>}

            <Box sx={{ mt: 1, maxHeight: 220, overflow: 'auto' }}>
              {reports.length === 0 && !loading && (
                <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', textAlign: 'center', py: 2 }}>
                  No reports match. Be the first to report!
                </Typography>
              )}
              {reports.map(r => {
                const meta = REPORT_TYPES[r.type] || REPORT_TYPES.pothole;
                const st = REPORT_STATUS[r.status] || REPORT_STATUS.open;
                return (
                  <Box key={r.id} onClick={() => setSelected(r)} sx={{
                    p: 1, mb: 0.75, borderRadius: '10px', cursor: 'pointer',
                    border: selected && selected.id === r.id ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.02)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: meta.color }} />
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: 12.5, flex: 1 }}>{meta.label}</Typography>
                      <Chip size="small" label={st.label} sx={{ fontSize: 10, height: 20, color: st.color, borderColor: st.color }} variant="outlined" />
                    </Box>
                    {r.description && <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', mt: 0.25, fontSize: 11.5 }}>{r.description}</Typography>}
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: 10.5 }}>{new Date(r.createdAt).toLocaleString()}</Typography>
                  </Box>
                );
              })}
            </Box>
          </>
        ) : (
          <>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              {pickPoint ? 'Tap the map to pin the location' : 'Describe the issue'}
            </Typography>

            {pickPoint && (
              <Alert severity="info" sx={{ fontSize: 12.5, py: 0.5, mb: 1 }}>
                Crosshair mode on — click anywhere on the map to set the marker.
              </Alert>
            )}
            {live && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, p: 0.75, borderRadius: '8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)' }}>
                <MapPin size={14} color="#818cf8" />
                <Typography variant="body2" sx={{ fontSize: 12, fontFamily: 'monospace' }}>{live.lat.toFixed(5)}, {live.lng.toFixed(5)}</Typography>
                <IconButton size="small" onClick={() => { setLive(null); setPickPoint(true); }} sx={{ ml: 'auto' }}><RefreshCw size={13} /></IconButton>
              </Box>
            )}

            {!pickPoint && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Problem type</InputLabel>
                  <Select value={reportType} label="Problem type" onChange={(e) => setReportType(e.target.value)} sx={{ fontSize: 13 }}>
                    {REPORT_TYPE_IDS.map(t => <MenuItem key={t} value={t}>{REPORT_TYPES[t].icon} {REPORT_TYPES[t].label}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField
                  size="small" fullWidth multiline minRows={2} label="Description"
                  placeholder="e.g. Large pothole near the service lane, causing delays"
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  sx={{ fontSize: 13 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => { setShowForm(false); setLive(null); setPickPoint(false); }} sx={{ textTransform: 'none' }}>Cancel</Button>
                  <Button size="small" variant="contained" onClick={submitReport} disabled={saving || !live || !description.trim()} startIcon={saving ? <CircularProgress size={13} /> : <CheckCircle2 size={14} />} sx={{ textTransform: 'none', borderRadius: '8px', flex: 1 }}>
                    Submit report
                  </Button>
                </Box>
              </Box>
            )}
            {error && <Alert severity="error" sx={{ mt: 1, fontSize: 12.5, py: 0.5 }}>{error}</Alert>}
          </>
        )}
      </Card>

      {/* Floating top-right: legend */}
      <Card sx={{ position: 'absolute', top: 14, right: 14, zIndex: 1000, p: 1.25, borderRadius: '14px', background: 'rgba(16,22,39,0.92)', width: 150 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, display: 'block', mb: 0.75 }}>Legend</Typography>
        {REPORT_TYPE_IDS.map(t => (
          <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.15 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: REPORT_TYPES[t].color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 800 }}>{REPORT_TYPES[t].icon}</Box>
            <Typography variant="caption" sx={{ fontSize: 11, color: 'var(--text-muted)' }}>{REPORT_TYPES[t].label}</Typography>
          </Box>
        ))}
      </Card>

      {/* Floating bottom-left: selected report detail */}
      {selected && (
        <Card sx={{
          position: 'absolute', bottom: 12, left: 14, zIndex: 1000, p: 1.5, borderRadius: '16px', width: { xs: '92%', sm: 360 },
          background: 'rgba(16,22,39,0.94)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ display: 'inline-flex', p: 1, borderRadius: '10px', background: (REPORT_TYPES[selected.type] || REPORT_TYPES.pothole).color + '22' }}>
              <AlertTriangle size={16} color={(REPORT_TYPES[selected.type] || REPORT_TYPES.pothole).color} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{(REPORT_TYPES[selected.type] || REPORT_TYPES.pothole).label}</Typography>
              {selected.description && <Typography variant="body2" sx={{ fontSize: 13, color: 'var(--text-main)', mt: 0.25 }}>{selected.description}</Typography>}
              <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', mt: 0.5 }}>
                Reported by {selected.reportedBy || 'Anonymous'} · {new Date(selected.createdAt).toLocaleString()}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                <span style={{ color: (REPORT_STATUS[selected.status] || REPORT_STATUS.open).color, fontSize: 12, fontWeight: 700 }}>
                  {statusIcon(selected.status)} {(REPORT_STATUS[selected.status] || REPORT_STATUS.open).label}
                </span>
              </Box>
              {selected.status !== 'resolved' && (
                <Button size="small" variant="outlined" color="success" onClick={() => setResolved(selected)} sx={{ mt: 1, textTransform: 'none', fontSize: 12 }} startIcon={<CheckCircle2 size={14} />}>
                  Mark resolved
                </Button>
              )}
            </Box>
            <IconButton size="small" onClick={() => setSelected(null)}><X size={15} /></IconButton>
          </Box>
        </Card>
      )}

      {/* Bottom-left hint when nothing selected */}
      {!selected && !showForm && (
        <Card sx={{ position: 'absolute', bottom: 12, left: 14, zIndex: 1000, p: 1.25, borderRadius: '14px', background: 'rgba(16,22,39,0.9)', maxWidth: 280 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Heart size={15} color="#f43f5e" />
            <Typography variant="body2" sx={{ fontSize: 12.5 }}>
              Tap any marker to view details, or report a new road problem.
            </Typography>
          </Box>
        </Card>
      )}
    </Box>
  );
}
