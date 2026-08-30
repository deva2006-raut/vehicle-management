import React from 'react';
import { Box, Typography, Card, Grid, Button, Divider } from '@mui/material';
import { Download, FileText, Settings, Calendar, AlertCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

export default function ReportsView({ vehicles, drivers, orders, solution }) {

  // PDF Export logic
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("VROOM Optima - Dispatch Report", 15, 20);

    doc.setFontSize(12);
    doc.setFont("Helvetica", "normal");
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 15, 28);
    doc.text(`Total Active Vehicles: ${vehicles.length}`, 15, 36);
    doc.text(`Total Orders Cataloged: ${orders.length}`, 15, 44);

    doc.line(15, 48, 195, 48);

    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.text("Fleet Operational Status", 15, 56);
    
    let yOffset = 64;
    doc.setFontSize(10);
    doc.setFont("Helvetica", "bold");
    doc.text("Name", 15, yOffset);
    doc.text("License Plate", 50, yOffset);
    doc.text("Capacity", 90, yOffset);
    doc.text("Status", 130, yOffset);
    
    yOffset += 6;
    doc.line(15, yOffset - 2, 195, yOffset - 2);

    doc.setFont("Helvetica", "normal");
    vehicles.forEach(v => {
      doc.text(v.name, 15, yOffset);
      doc.text(v.number || 'N/A', 50, yOffset);
      doc.text(`${v.capacity[0]} units`, 90, yOffset);
      doc.text(v.status, 130, yOffset);
      yOffset += 8;
    });

    yOffset += 10;
    doc.setFontSize(14);
    doc.setFont("Helvetica", "bold");
    doc.text("Active Dispatch Orders", 15, yOffset);
    
    yOffset += 8;
    doc.setFontSize(10);
    doc.text("Order ID", 15, yOffset);
    doc.text("Customer", 40, yOffset);
    doc.text("Details", 80, yOffset);
    doc.text("Weight", 140, yOffset);
    doc.text("Status", 170, yOffset);

    yOffset += 4;
    doc.line(15, yOffset - 2, 195, yOffset - 2);

    doc.setFont("Helvetica", "normal");
    orders.forEach(o => {
      doc.text(`#${o.id}`, 15, yOffset);
      doc.text(o.customer || 'Unknown', 40, yOffset);
      doc.text(o.description.substring(0, 30), 80, yOffset);
      doc.text(`${o.demand[0]} kg`, 140, yOffset);
      doc.text(o.status, 170, yOffset);
      yOffset += 8;
    });

    doc.save("VroomOptima_Dispatch_Report.pdf");
  };

  // Excel Export logic
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Vehicles Sheet
    const vehicleData = vehicles.map(v => ({
      ID: v.id,
      Name: v.name,
      NumberPlate: v.number || 'N/A',
      Capacity: v.capacity[0],
      Type: v.type,
      FuelType: v.fuelType,
      Status: v.status
    }));
    const wsVehicles = XLSX.utils.json_to_sheet(vehicleData);
    XLSX.utils.book_append_sheet(wb, wsVehicles, "Fleet Status");

    // Orders Sheet
    const orderData = orders.map(o => ({
      ID: o.id,
      Customer: o.customer,
      Phone: o.phone || 'N/A',
      Description: o.description,
      Weight_kg: o.demand[0],
      Priority: o.priority,
      Status: o.status,
      Latitude: o.location[0],
      Longitude: o.location[1]
    }));
    const wsOrders = XLSX.utils.json_to_sheet(orderData);
    XLSX.utils.book_append_sheet(wb, wsOrders, "Dispatch Orders");

    XLSX.writeFile(wb, "VroomOptima_Operations_Log.xlsx");
  };

  // CSV Export logic
  const handleExportCSV = () => {
    const headers = ["Order ID", "Customer", "Details", "Weight", "Status"];
    const rows = orders.map(o => [
      o.id,
      o.customer || 'N/A',
      o.description,
      `${o.demand[0]} kg`,
      o.status
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "VroomOptima_Orders.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Reporting Operations Center</Typography>
        <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>Generate and export analytical and operational logs</Typography>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Daily summary report card */}
        <Grid item xs={12} md={4}>
          <Card className="glass-panel" sx={{ p: 3, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 'var(--radius-sm)', bgcolor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center' }}>
                <FileText size={24} />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Operational Dispatch Log</Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Full fleet dispatch manifest</Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 3, flexGrow: 1 }}>
              Generates a detailed manifest showing current active vehicles, assigned drivers, capacity margins, and all delivery stops. Perfect for dispatch managers.
            </Typography>
            <Divider sx={{ mb: 2, borderColor: 'var(--border-color)' }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="contained" startIcon={<Download size={14} />} onClick={handleExportPDF} sx={{ flex: 1, textTransform: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                Export PDF
              </Button>
              <Button size="small" variant="outlined" onClick={handleExportExcel} sx={{ flex: 1, textTransform: 'none', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                Export Excel
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Orders Manifest Card */}
        <Grid item xs={12} md={4}>
          <Card className="glass-panel" sx={{ p: 3, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 'var(--radius-sm)', bgcolor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center' }}>
                <Calendar size={24} />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Orders Fulfillment Sheet</Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>Package and customer records</Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 3, flexGrow: 1 }}>
              Export customer names, mobile numbers, parcel weights, delivery status, priorities, and geographic coordinates. Ideal for accounting and logistics auditing.
            </Typography>
            <Divider sx={{ mb: 2, borderColor: 'var(--border-color)' }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="contained" startIcon={<Download size={14} />} onClick={handleExportExcel} sx={{ flex: 1, textTransform: 'none', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                Export Excel
              </Button>
              <Button size="small" variant="outlined" onClick={handleExportCSV} sx={{ flex: 1, textTransform: 'none', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                Export CSV
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Custom query logger card */}
        <Grid item xs={12} md={4}>
          <Card className="glass-panel" sx={{ p: 3, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: 'var(--radius-sm)', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
                <Settings size={24} />
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>System Optimization Metrics</Typography>
                <Typography variant="caption" sx={{ color: 'var(--text-muted)' }}>VROOM solver duration & cost logs</Typography>
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 3, flexGrow: 1 }}>
              Generates a telemetry sheet of VROOM core operations: total solving duration, route mileage efficiency ratios, and fuel savings statistics.
            </Typography>
            <Divider sx={{ mb: 2, borderColor: 'var(--border-color)' }} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button size="small" variant="contained" startIcon={<Download size={14} />} onClick={handleExportPDF} sx={{ flex: 1, textTransform: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                Export PDF
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>

      {/* Audit warning banner */}
      <Card className="glass-panel" sx={{ p: 2, border: '1px solid rgba(245, 158, 11, 0.2)', backgroundColor: 'rgba(245, 158, 11, 0.05)', display: 'flex', gap: 2, alignItems: 'center' }}>
        <AlertCircle color="#f59e0b" size={24} />
        <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 600 }}>
          Exporting customer addresses and phone numbers contains Sensitive Personal Information. Ensure standard company GDPR compliance and data auditing protocols are followed when downloading reports.
        </Typography>
      </Card>
    </Box>
  );
}
