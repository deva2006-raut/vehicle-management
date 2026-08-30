import React, { useState } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Button, TextField, MenuItem, Dialog, DialogTitle, 
  DialogContent, DialogActions, Chip, Avatar, Rating 
} from '@mui/material';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function DriverManagement({ drivers, onAdd, onEdit, onDelete, vehicles }) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [license, setLicense] = useState('');
  const [availability, setAvailability] = useState('available'); // 'available' | 'busy' | 'off-duty'
  const [completedCount, setCompletedCount] = useState('0');
  const [rating, setRating] = useState(5);

  const handleOpen = (driver = null) => {
    if (driver) {
      setEditId(driver.id);
      setName(driver.name);
      setPhone(driver.phone || '');
      setEmail(driver.email || '');
      setLicense(driver.license || '');
      setAvailability(driver.availability || 'available');
      setCompletedCount(driver.completedCount.toString());
      setRating(driver.rating);
    } else {
      setEditId(null);
      setName('');
      setPhone('');
      setEmail('');
      setLicense('');
      setAvailability('available');
      setCompletedCount('0');
      setRating(5);
    }
    setOpen(true);
  };

  const handleSave = () => {
    if (!name || !phone) {
      alert('Please fill out Name and Phone Number');
      return;
    }
    const driverData = {
      name,
      phone,
      email,
      license,
      availability,
      completedCount: parseInt(completedCount) || 0,
      rating: parseFloat(rating) || 5
    };

    if (editId !== null) {
      onEdit(editId, driverData);
    } else {
      onAdd(driverData);
    }
    setOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Driver Fleet Registry</Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => handleOpen()} sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 'var(--radius-sm)' }}>
          Register Driver
        </Button>
      </Box>

      <TableContainer className="glass-panel" sx={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Driver Info</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Contact Details</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>License No.</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Assigned Vehicle</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Trips Finished</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Ratings</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Availability</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {drivers.map((d) => {
              const assignedVehicle = vehicles.find(v => v.driverId === d.id);
              return (
                <TableRow key={d.id} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.01)' } }}>
                  <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: 'var(--accent-indigo)', width: 32, height: 32 }}>{d.name.charAt(0)}</Avatar>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'var(--text-main)' }}>{d.name}</Typography>
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-main)' }}>
                    <div>{d.phone}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{d.email || 'No email'}</div>
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-muted)' }}>{d.license || 'N/A'}</TableCell>
                  <TableCell sx={{ color: 'var(--text-main)', fontWeight: 500 }}>
                    {assignedVehicle ? assignedVehicle.name : 'None'}
                  </TableCell>
                  <TableCell sx={{ color: 'var(--text-main)' }}>{d.completedCount} orders</TableCell>
                  <TableCell>
                    <Rating value={d.rating} readOnly precision={0.5} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={d.availability} 
                      size="small" 
                      color={d.availability === 'available' ? 'success' : d.availability === 'busy' ? 'warning' : 'default'} 
                      sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button onClick={() => handleOpen(d)} size="small" startIcon={<Edit2 size={14} />} sx={{ mr: 1, color: 'var(--accent-indigo)' }}>Edit</Button>
                    <Button onClick={() => onDelete(d.id)} size="small" startIcon={<Trash2 size={14} />} color="error">Delete</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { bgcolor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white' } }}>
        <DialogTitle>{editId !== null ? 'Edit Driver Info' : 'Register New Driver'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1, minWidth: 400 }}>
          <TextField label="Driver Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          <TextField label="Mobile Number" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          <TextField label="Email Address" fullWidth type="email" value={email} onChange={(e) => setEmail(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          <TextField label="Driver's License Number" fullWidth value={license} onChange={(e) => setLicense(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          <TextField label="Completed Deliveries" fullWidth type="number" value={completedCount} onChange={(e) => setCompletedCount(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          
          <TextField select label="Driver Availability" fullWidth value={availability} onChange={(e) => setAvailability(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} SelectProps={{ style: { color: 'white' } }}>
            <MenuItem value="available">Available (On duty)</MenuItem>
            <MenuItem value="busy">Busy (In transit)</MenuItem>
            <MenuItem value="off-duty">Off duty</MenuItem>
          </TextField>

          <TextField label="Rating (1-5)" fullWidth type="number" inputProps={{ min: 1, max: 5, step: 0.5 }} value={rating} onChange={(e) => setRating(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>Save Driver</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
