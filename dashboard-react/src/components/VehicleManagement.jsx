import React, { useState } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Card, Button, TextField, MenuItem, Dialog, DialogTitle, 
  DialogContent, DialogActions, Chip 
} from '@mui/material';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function VehicleManagement({ vehicles, onAdd, onEdit, onDelete, drivers }) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [type, setType] = useState('truck'); // 'truck' | 'van' | 'car'
  const [fuelType, setFuelType] = useState('diesel'); // 'diesel' | 'electric' | 'petrol'
  const [status, setStatus] = useState('active'); // 'active' | 'in-transit' | 'maintenance'
  const [driverId, setDriverId] = useState('');

  const handleOpen = (vehicle = null) => {
    if (vehicle) {
      setEditId(vehicle.id);
      setName(vehicle.name);
      setNumber(vehicle.number || '');
      setCapacity(vehicle.capacity[0].toString());
      setType(vehicle.type || 'truck');
      setFuelType(vehicle.fuelType || 'diesel');
      setStatus(vehicle.status || 'active');
      setDriverId(vehicle.driverId || '');
    } else {
      setEditId(null);
      setName('');
      setNumber('');
      setCapacity('100');
      setType('truck');
      setFuelType('diesel');
      setStatus('active');
      setDriverId(drivers[0]?.id || '');
    }
    setOpen(true);
  };

  const handleSave = () => {
    if (!name || !capacity) {
      alert('Please fill out Name and Capacity');
      return;
    }
    const capInt = parseInt(capacity) || 100;
    const vehicleData = {
      name,
      number,
      capacity: [capInt],
      type,
      fuelType,
      status,
      driverId
    };

    if (editId !== null) {
      onEdit(editId, vehicleData);
    } else {
      onAdd(vehicleData);
    }
    setOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Fleet Management</Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => handleOpen()} sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 'var(--radius-sm)' }}>
          Add Vehicle
        </Button>
      </Box>

      <TableContainer className="glass-panel" sx={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Vehicle Name</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Number Plate</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Capacity</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Type</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Fuel Type</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Driver Assigned</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.map((v) => {
              const assignedDriver = drivers.find(d => d.id === v.driverId);
              return (
                <TableRow key={v.id} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.01)' } }}>
                  <TableCell sx={{ fontWeight: 600, color: 'var(--text-main)' }}>{v.name}</TableCell>
                  <TableCell sx={{ color: 'var(--text-muted)' }}>{v.number || 'N/A'}</TableCell>
                  <TableCell sx={{ color: 'var(--text-main)' }}>{v.capacity[0]} units</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{v.type || 'Truck'}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{v.fuelType || 'Diesel'}</TableCell>
                  <TableCell sx={{ color: 'var(--text-main)' }}>{assignedDriver ? assignedDriver.name : 'Unassigned'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={v.status} 
                      size="small" 
                      color={v.status === 'active' || v.status === 'in-transit' ? 'success' : v.status === 'maintenance' ? 'warning' : 'default'} 
                      sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button onClick={() => handleOpen(v)} size="small" startIcon={<Edit2 size={14} />} sx={{ mr: 1, color: 'var(--accent-indigo)' }}>Edit</Button>
                    <Button onClick={() => onDelete(v.id)} size="small" startIcon={<Trash2 size={14} />} color="error">Delete</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { bgcolor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white' } }}>
        <DialogTitle>{editId !== null ? 'Edit Vehicle Info' : 'Register New Vehicle'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1, minWidth: 400 }}>
          <TextField label="Vehicle Name (e.g. Truck Beta)" fullWidth value={name} onChange={(e) => setName(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          <TextField label="License Plate Number" fullWidth value={number} onChange={(e) => setNumber(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          <TextField label="Load Capacity (metric units)" fullWidth type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          
          <TextField select label="Vehicle Type" fullWidth value={type} onChange={(e) => setType(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} SelectProps={{ style: { color: 'white' } }}>
            <MenuItem value="truck">Semi-Truck</MenuItem>
            <MenuItem value="van">Delivery Van</MenuItem>
            <MenuItem value="car">Courier Car</MenuItem>
          </TextField>

          <TextField select label="Fuel Type" fullWidth value={fuelType} onChange={(e) => setFuelType(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} SelectProps={{ style: { color: 'white' } }}>
            <MenuItem value="diesel">Diesel</MenuItem>
            <MenuItem value="petrol">Petrol / Gas</MenuItem>
            <MenuItem value="electric">Electric (EV)</MenuItem>
          </TextField>

          <TextField select label="Assigned Driver" fullWidth value={driverId} onChange={(e) => setDriverId(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} SelectProps={{ style: { color: 'white' } }}>
            {drivers.map(d => (
              <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
            ))}
          </TextField>

          <TextField select label="Current Status" fullWidth value={status} onChange={(e) => setStatus(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} SelectProps={{ style: { color: 'white' } }}>
            <MenuItem value="active">Active (Available)</MenuItem>
            <MenuItem value="in-transit">In-Transit</MenuItem>
            <MenuItem value="maintenance">Maintenance</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>Save Vehicle</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
