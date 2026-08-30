import React from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Card, Chip 
} from '@mui/material';
import { Play, Square, Route } from 'lucide-react';

export default function SolutionTable({ solution, vehicles, orders }) {
  if (!solution) {
    return (
      <Card className="glass-panel" sx={{ p: 4, textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
          Run the VROOM route optimizer to display optimal dispatch sequences.
        </Typography>
      </Card>
    );
  }

  let stopNum = 1;
  const tableRows = [];

  solution.routes.forEach(route => {
    const vehicle = vehicles.find(v => v.id === route.vehicle);
    const vehicleName = vehicle ? vehicle.name : `Vehicle ${route.vehicle}`;
    const vehicleColor = vehicle ? vehicle.color : '#ffffff';

    route.steps.forEach(step => {
      let typeChip = null;
      let labelText = '';

      if (step.type === 'start') {
        typeChip = <Chip icon={<Play size={12} />} label="Start" size="small" sx={{ bgcolor: vehicleColor, color: 'white', fontWeight: 600 }} />;
        labelText = `Start depot for ${vehicleName}`;
      } else if (step.type === 'end') {
        typeChip = <Chip icon={<Square size={12} />} label="End" size="small" sx={{ bgcolor: vehicleColor, opacity: 0.7, color: 'white', fontWeight: 600 }} />;
        labelText = `End depot for ${vehicleName}`;
      } else if (step.type === 'job') {
        typeChip = <Chip icon={<Route size={12} />} label={`Stop #${stopNum}`} size="small" sx={{ bgcolor: 'var(--accent-indigo)', color: 'white', fontWeight: 600 }} />;
        const orderInfo = orders.find(o => o.id === step.id);
        labelText = `Order #${step.id} - ${orderInfo ? orderInfo.customer : 'Customer'} (${orderInfo ? orderInfo.description : 'Delivery'})`;
      }

      const arrivalTime = step.arrival ? `${Math.round(step.arrival / 60)} min` : '0 min';
      const serviceTime = step.service ? `${Math.round(step.service / 60)} min` : '0 min';
      const violations = step.violations && step.violations.length > 0 ? step.violations.join(', ') : 'None';

      tableRows.push({
        num: stopNum++,
        vehicle: vehicleName,
        color: vehicleColor,
        type: typeChip,
        location: labelText,
        arrival: arrivalTime,
        service: serviceTime,
        violations: violations
      });
    });
  });

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>Optimized Delivery Sequence</Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Total Cost: {solution.summary.cost} | Routes Generated: {solution.summary.routes} | Solved in {solution.summary.computing_times.solving}ms
        </Typography>
      </Box>

      <TableContainer className="glass-panel" sx={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', maxHeight: 250, overflowY: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ bgcolor: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontWeight: 600 }}>Seq</TableCell>
              <TableCell sx={{ bgcolor: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontWeight: 600 }}>Vehicle</TableCell>
              <TableCell sx={{ bgcolor: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontWeight: 600 }}>Stop Type</TableCell>
              <TableCell sx={{ bgcolor: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontWeight: 600 }}>Stop Description</TableCell>
              <TableCell sx={{ bgcolor: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontWeight: 600 }}>Est. Arrival</TableCell>
              <TableCell sx={{ bgcolor: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontWeight: 600 }}>Service Duration</TableCell>
              <TableCell sx={{ bgcolor: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontWeight: 600 }}>Violations</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableRows.map((row, i) => (
              <TableRow key={i} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.01)' } }}>
                <TableCell sx={{ fontWeight: 600, color: 'var(--text-main)' }}>{row.num}</TableCell>
                <TableCell sx={{ color: row.color, fontWeight: 600 }}>{row.vehicle}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell sx={{ color: 'var(--text-main)', fontWeight: 500 }} dangerouslySetInnerHTML={{ __html: row.location }} />
                <TableCell sx={{ color: 'var(--text-main)' }}>{row.arrival}</TableCell>
                <TableCell sx={{ color: 'var(--text-muted)' }}>{row.service}</TableCell>
                <TableCell sx={{ color: row.violations !== 'None' ? 'var(--accent-rose)' : 'var(--text-muted)', fontWeight: row.violations !== 'None' ? 600 : 400 }}>
                  {row.violations}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
