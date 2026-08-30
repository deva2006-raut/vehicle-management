import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, Grid, LinearProgress, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material';
import { Compass, AlertCircle, RefreshCw } from 'lucide-react';

export default function LiveTracking({ vehicles, drivers, orders, solution }) {
  const [activeTracking, setActiveTracking] = useState([]);

  // Simulate movement and telemetry data
  useEffect(() => {
    // Generate simulated live state for transit vehicles
    const transitList = vehicles.map((v, idx) => {
      const assignedDriver = drivers.find(d => d.id === v.driverId);
      const isTransit = v.status === 'in-transit' || v.status === 'active';
      
      // Calculate random telemetry
      const currentSpeed = isTransit ? Math.round(40 + Math.random() * 25) : 0;
      const progress = isTransit ? Math.round(15 + Math.random() * 70) : 0;
      const heading = ['North', 'East', 'South-East', 'West', 'North-West'][idx % 5];
      const remainingMiles = isTransit ? (25 - Math.round(progress * 0.2)) : 0;
      const eta = isTransit ? `${Math.round(remainingMiles * 2.5)} mins` : 'N/A';

      return {
        vehicleId: v.id,
        vehicleName: v.name,
        driverName: assignedDriver ? assignedDriver.name : 'Unknown Driver',
        speed: currentSpeed,
        progress: progress,
        heading: heading,
        remainingDist: remainingMiles,
        eta: eta,
        status: v.status,
        lat: v.start[0] + (isTransit ? (Math.random() - 0.5) * 0.01 : 0),
        lng: v.start[1] + (isTransit ? (Math.random() - 0.5) * 0.01 : 0)
      };
    });

    setActiveTracking(transitList);

    // Set interval to simulate live updates
    const interval = setInterval(() => {
      setActiveTracking(prev => prev.map(t => {
        if (t.status === 'active' || t.status === 'in-transit') {
          const nextProgress = Math.min(100, t.progress + Math.round(Math.random() * 3));
          const isDone = nextProgress === 100;
          return {
            ...t,
            progress: isDone ? 0 : nextProgress, // reset to loop simulation
            speed: isDone ? 0 : Math.round(35 + Math.random() * 20),
            remainingDist: isDone ? 0 : Math.max(1, t.remainingDist - 0.5)
          };
        }
        return t;
      }));
    }, 4000);

    return () => clearInterval(interval);
  }, [vehicles, drivers, solution]);

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Active Fleet Dispatch Telemetry</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>Real-time GPS tracking and transit analytics</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'var(--accent-emerald)', fontSize: '14px', fontWeight: 600 }}>
          <RefreshCw size={16} className="animate-spin" /> Live Syncing Active
        </Box>
      </Box>

      {/* Grid of active transits */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {activeTracking.filter(t => t.status === 'active' || t.status === 'in-transit').slice(0, 3).map((t, idx) => (
          <Grid item xs={12} md={4} key={idx}>
            <Card className="glass-panel" sx={{ p: 3, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-main)' }}>{t.vehicleName}</Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Driver: {t.driverName}</Typography>
                </Box>
                <Chip icon={<Compass size={12} />} label={t.heading} size="small" color="primary" sx={{ fontWeight: 600 }} />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 3 }}>
                <div>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>{t.speed} <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>km/h</span></Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Current Speed</Typography>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'var(--accent-indigo)' }}>{t.eta}</Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Est. Arrival (ETA)</Typography>
                </div>
              </Box>

              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Route Progress</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>{t.progress}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={t.progress} 
                  sx={{ 
                    height: 5, 
                    borderRadius: 2.5, 
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'var(--accent-indigo)'
                    }
                  }} 
                />
              </Box>
              <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'block', mt: 1 }}>
                Remaining Distance: {t.remainingDist.toFixed(1)} km
              </Typography>
            </Card>
          </Grid>
        ))}
        {activeTracking.filter(t => t.status === 'active' || t.status === 'in-transit').length === 0 && (
          <Grid item xs={12}>
            <Card className="glass-panel" sx={{ p: 4, textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '2px dashed var(--border-color)' }}>
              <AlertCircle size={32} color="#f59e0b" style={{ marginBottom: 12 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>No Active Vehicles in Transit</Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>Set vehicle status to Active or In-Transit to start live simulations.</Typography>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Dispatch Telemetry list */}
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>GPS Status Log</Typography>
      <TableContainer className="glass-panel" sx={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Vehicle Name</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Driver Name</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Coordinates</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Speed</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Heading</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>ETA</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Remaining Dist</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activeTracking.map((t, idx) => (
              <TableRow key={idx} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.01)' } }}>
                <TableCell sx={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.vehicleName}</TableCell>
                <TableCell sx={{ color: 'var(--text-main)' }}>{t.driverName}</TableCell>
                <TableCell sx={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  {t.lat.toFixed(6)}, {t.lng.toFixed(6)}
                </TableCell>
                <TableCell sx={{ color: 'var(--text-main)' }}>{t.speed} km/h</TableCell>
                <TableCell sx={{ color: 'var(--text-muted)' }}>{t.heading}</TableCell>
                <TableCell sx={{ color: 'var(--accent-indigo)', fontWeight: 600 }}>{t.eta}</TableCell>
                <TableCell sx={{ color: 'var(--text-main)' }}>
                  {t.remainingDist > 0 ? `${t.remainingDist.toFixed(1)} km` : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
