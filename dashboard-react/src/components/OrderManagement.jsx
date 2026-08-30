import React, { useState } from 'react';
import { 
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Button, TextField, MenuItem, Dialog, DialogTitle, 
  DialogContent, DialogActions, Chip 
} from '@mui/material';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function OrderManagement({ orders, onAdd, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [desc, setDesc] = useState('');
  const [weight, setWeight] = useState('10');
  const [priority, setPriority] = useState('1'); // '1' | '2' | '3' (Low, Medium, High)
  const [status, setStatus] = useState('pending'); // 'pending' | 'completed'
  const [service, setService] = useState('5'); // Service time in mins
  const [lat, setLat] = useState('40.7580'); // Dummy default coordinates
  const [lng, setLng] = useState('-73.9855');

  const handleOpen = (order = null) => {
    if (order) {
      setEditId(order.id);
      setCustomer(order.customer || '');
      setPhone(order.phone || '');
      setDesc(order.description || '');
      setWeight(order.demand[0].toString());
      setPriority(order.priority ? order.priority.toString() : '1');
      setStatus(order.status || 'pending');
      setService(Math.round(order.service / 60).toString());
      setLat(order.location[0].toString());
      setLng(order.location[1].toString());
    } else {
      setEditId(null);
      setCustomer('');
      setPhone('');
      setDesc('');
      setWeight('10');
      setPriority('1');
      setStatus('pending');
      setService('5');
      // Set to current map center/default
      setLat('40.7580');
      setLng('-73.9855');
    }
    setOpen(true);
  };

  const handleSave = () => {
    if (!customer || !desc || !lat || !lng) {
      alert('Please fill out Customer, Description, Latitude and Longitude');
      return;
    }
    const orderData = {
      customer,
      phone,
      description: desc,
      demand: [parseInt(weight) || 10],
      priority: parseInt(priority) || 1,
      status,
      service: (parseInt(service) || 5) * 60,
      location: [parseFloat(lat), parseFloat(lng)]
    };

    if (editId !== null) {
      onEdit(editId, orderData);
    } else {
      onAdd(orderData);
    }
    setOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>Orders Dispatch Board</Typography>
        <Button variant="contained" startIcon={<Plus size={18} />} onClick={() => handleOpen()} sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 'var(--radius-sm)' }}>
          Create Order
        </Button>
      </Box>

      <TableContainer className="glass-panel" sx={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.1)' }}>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Order ID</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Customer Name</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Delivery Address / Details</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Coordinates (Lat, Lng)</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Weight (kg)</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Priority</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ color: 'var(--text-muted)', fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((o, idx) => (
              <TableRow key={o.id} sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.01)' } }}>
                <TableCell sx={{ fontWeight: 600, color: 'var(--text-main)' }}>#{o.id}</TableCell>
                <TableCell sx={{ color: 'var(--text-main)', fontWeight: 500 }}>
                  <div>{o.customer || `Customer ${idx + 1}`}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.phone || 'No phone'}</div>
                </TableCell>
                <TableCell sx={{ color: 'var(--text-muted)', maxWidth: 220 }}>{o.description}</TableCell>
                <TableCell sx={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                  {o.location[0].toFixed(5)}, {o.location[1].toFixed(5)}
                </TableCell>
                <TableCell sx={{ color: 'var(--text-main)' }}>{o.demand[0]} kg</TableCell>
                <TableCell>
                  <Chip 
                    label={o.priority === 3 ? 'High' : o.priority === 2 ? 'Medium' : 'Low'} 
                    size="small" 
                    color={o.priority === 3 ? 'error' : o.priority === 2 ? 'primary' : 'default'} 
                    sx={{ fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={o.status} 
                    size="small" 
                    color={o.status === 'completed' || o.status === 'delivered' ? 'success' : 'default'} 
                    sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button onClick={() => handleOpen(o)} size="small" startIcon={<Edit2 size={14} />} sx={{ mr: 1, color: 'var(--accent-indigo)' }}>Edit</Button>
                  <Button onClick={() => onDelete(o.id)} size="small" startIcon={<Trash2 size={14} />} color="error">Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { bgcolor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', color: 'white' } }}>
        <DialogTitle>{editId !== null ? 'Modify Order Details' : 'Create Dispatch Order'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1, minWidth: 400 }}>
          <TextField label="Customer Name" fullWidth value={customer} onChange={(e) => setCustomer(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          <TextField label="Phone Number" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          <TextField label="Delivery Description / Notes" fullWidth value={desc} onChange={(e) => setDesc(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          <TextField label="Package Weight (kg)" fullWidth type="number" value={weight} onChange={(e) => setWeight(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          <TextField label="Service Duration (mins)" fullWidth type="number" value={service} onChange={(e) => setService(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Latitude" fullWidth value={lat} onChange={(e) => setLat(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
            <TextField label="Longitude" fullWidth value={lng} onChange={(e) => setLng(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
          </Box>

          <TextField select label="Order Priority" fullWidth value={priority} onChange={(e) => setPriority(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} SelectProps={{ style: { color: 'white' } }}>
            <MenuItem value="1">Low Priority</MenuItem>
            <MenuItem value="2">Medium Priority</MenuItem>
            <MenuItem value="3">High Priority</MenuItem>
          </TextField>

          <TextField select label="Delivery Status" fullWidth value={status} onChange={(e) => setStatus(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} SelectProps={{ style: { color: 'white' } }}>
            <MenuItem value="pending">Pending Dispatch</MenuItem>
            <MenuItem value="completed">Delivered</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>Dispatch Order</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
