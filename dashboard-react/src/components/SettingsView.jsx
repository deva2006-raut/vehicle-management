import React from 'react';
import { Box, Typography, Card, TextField, Button, Switch, MenuItem, Select, InputLabel, FormControl, Grid } from '@mui/material';
import { Save, Shield, Bell, HelpCircle } from 'lucide-react';

export default function SettingsView({ settings, onSaveSettings }) {
  const [companyName, setCompanyName] = React.useState(settings.companyName || 'VROOM Optima Logistics');
  const [currency, setCurrency] = React.useState(settings.currency || 'USD');
  const [language, setLanguage] = React.useState(settings.language || 'en');
  const [vroomPath, setVroomPath] = React.useState(settings.vroomPath || '');
  const [notiNewOrder, setNotiNewOrder] = React.useState(settings.notiNewOrder !== false);
  const [notiDelay, setNotiDelay] = React.useState(settings.notiDelay !== false);
  const [notiOffline, setNotiOffline] = React.useState(settings.notiOffline !== false);

  const handleSave = () => {
    onSaveSettings({
      companyName,
      currency,
      language,
      vroomPath,
      notiNewOrder,
      notiDelay,
      notiOffline
    });
    alert('Settings successfully updated!');
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>System Settings</Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>Configure company profile, routing engine paths, and alert thresholds</Typography>
        </Box>
        <Button variant="contained" startIcon={<Save size={16} />} onClick={handleSave} sx={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 'var(--radius-sm)', textTransform: 'none' }}>
          Save Configuration
        </Button>
      </Box>

      <Grid container spacing={3}>
        {/* Company Settings */}
        <Grid item xs={12} md={6}>
          <Card className="glass-panel" sx={{ p: 3, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Shield size={18} color="var(--accent-indigo)" /> Company Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField label="Company Name" fullWidth value={companyName} onChange={(e) => setCompanyName(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} />
              
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>Base Currency</InputLabel>
                <Select value={currency} label="Base Currency" onChange={(e) => setCurrency(e.target.value)} sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                  <MenuItem value="USD">USD ($) - US Dollar</MenuItem>
                  <MenuItem value="EUR">EUR (€) - Euro</MenuItem>
                  <MenuItem value="GBP">GBP (£) - British Pound</MenuItem>
                  <MenuItem value="INR">INR (₹) - Indian Rupee</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel sx={{ color: 'rgba(255,255,255,0.5)' }}>System Language</InputLabel>
                <Select value={language} label="System Language" onChange={(e) => setLanguage(e.target.value)} sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.15)' } }}>
                  <MenuItem value="en">English (US)</MenuItem>
                  <MenuItem value="es">Español</MenuItem>
                  <MenuItem value="fr">Français</MenuItem>
                  <MenuItem value="hi">हिन्दी (Hindi)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Card>
        </Grid>

        {/* Notifications & Dispatch Alerts Settings */}
        <Grid item xs={12} md={6}>
          <Card className="glass-panel" sx={{ p: 3, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', height: '100%' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Bell size={18} color="var(--accent-indigo)" /> Dispatch Alert Parameters
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 'var(--radius-sm)', bgcolor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>New Order Placed Alerts</Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Notify when new customer dispatch orders arrive</Typography>
                </Box>
                <Switch checked={notiNewOrder} onChange={(e) => setNotiNewOrder(e.target.checked)} />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 'var(--radius-sm)', bgcolor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>SLA Delivery Delay Warnings</Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Flag route deviations or ETA traffic delays</Typography>
                </Box>
                <Switch checked={notiDelay} onChange={(e) => setNotiDelay(e.target.checked)} />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 'var(--radius-sm)', bgcolor: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Vehicle Offline Signals</Typography>
                  <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Trigger alarm if driver app loses GPS sync</Typography>
                </Box>
                <Switch checked={notiOffline} onChange={(e) => setNotiOffline(e.target.checked)} />
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Solver Paths Configuration */}
        <Grid item xs={12}>
          <Card className="glass-panel" sx={{ p: 3, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <HelpCircle size={18} color="var(--accent-indigo)" /> VROOM Engine Integration
            </Typography>
            <TextField label="VROOM Executable path (Leave empty to use $PATH)" fullWidth value={vroomPath} onChange={(e) => setVroomPath(e.target.value)} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.5)' } }} InputProps={{ style: { color: 'white' } }} sx={{ mb: 2 }} />
            <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>
              Specify absolute path to your vroom binary directory if it is not added to the system PATH. The vroom-express wrapper will automatically direct calls to this binary.
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
