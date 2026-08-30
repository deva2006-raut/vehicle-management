import React, { useState, useEffect, useMemo } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import { Navigation } from 'lucide-react';
import Layout from './components/Layout';
import AuthView from './components/AuthView';
import { userService } from './services/userService';
import DashboardView from './components/DashboardView';
import MapContainer from './components/MapContainer';
import VehicleManagement from './components/VehicleManagement';
import DriverManagement from './components/DriverManagement';
import OrderManagement from './components/OrderManagement';
import SolutionTable from './components/SolutionTable';
import LiveTracking from './components/LiveTracking';
import ReportsView from './components/ReportsView';
import SettingsView from './components/SettingsView';
import RoutePlanner from './components/RoutePlanner';
import ProfileView from './components/ProfileView';
import ReportIssueView from './components/ReportIssueView';
import './App.css';

// Initial Mock Drivers List (Indian fleet)
const initialDrivers = [
  { id: 1, name: 'Ravi Sharma', phone: '+91 98110 00101', email: 'ravi@optima.com', license: 'DL-48201983471', availability: 'available', completedCount: 42, rating: 4.8 },
  { id: 2, name: 'Priya Verma', phone: '+91 98110 00102', email: 'priya@optima.com', license: 'MH-14202015678', availability: 'available', completedCount: 38, rating: 4.9 },
  { id: 3, name: 'Amit Patel', phone: '+91 98110 00103', email: 'amit@optima.com', license: 'GJ-01202109834', availability: 'off-duty', completedCount: 15, rating: 4.2 }
];

// Initial Mock Vehicles List (based in New Delhi, India)
const initialVehicles = [
  { id: 0, name: 'Tata Ace #1', number: 'DL-01-AB-9821', capacity: [100], type: 'truck', fuelType: 'diesel', status: 'active', driverId: 1, start: [28.6139, 77.2090], end: [28.6139, 77.2090], color: '#6366f1' },
  { id: 1, name: 'Mahindra Van', number: 'DL-02-CD-1029', capacity: [60], type: 'van', fuelType: 'electric', status: 'active', driverId: 2, start: [28.6315, 77.2167], end: [28.6315, 77.2167], color: '#10b981' }
];

// Initial Mock Orders List (New Delhi, India)
const initialOrders = [
  { id: 100, customer: 'Connaught Place Goods', phone: '+91 98110 00901', description: 'Office Supplies Dropoff', demand: [20], priority: 2, status: 'pending', service: 300, location: [28.6315, 77.2167] },
  { id: 101, customer: 'India Gate Cafe', phone: '+91 98110 00902', description: 'Fresh Supplies Delivery', demand: [15], priority: 1, status: 'pending', service: 300, location: [28.6129, 77.2295] },
  { id: 102, customer: 'Karol Bagh Retail', phone: '+91 98110 00903', description: 'Electronics Package', demand: [40], priority: 3, status: 'pending', service: 600, location: [28.6519, 77.1909] },
  { id: 103, customer: 'Rajiv Chowk Brokers', phone: '+91 98110 00904', description: 'Financial Documents Courier', demand: [10], priority: 2, status: 'pending', service: 300, location: [28.6328, 77.2197] }
];

export default function App() {
  // Theme and authentication
  const [theme, setTheme] = useState('dark');

  // MUI theme that follows the app's dark/light toggle so every MUI
  // component (text fields, selects, typography) renders readable
  // light-on-dark text instead of Material's default black-on-dark.
  const muiTheme = useMemo(
    () => createTheme({
      palette: { mode: theme },
      shape: { borderRadius: 12 }
    }),
    [theme]
  );
  const [user, setUser] = useState(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Core Data States
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [solution, setSolution] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (data.vehicles?.length === 0 && data.drivers?.length === 0 && data.orders?.length === 0) {
          setVehicles(initialVehicles);
          setDrivers(initialDrivers);
          setOrders(initialOrders);
        } else {
          setVehicles(data.vehicles || []);
          setDrivers(data.drivers || []);
          setOrders(data.orders || []);
        }
        setDataLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load DB:', err);
        setVehicles(initialVehicles);
        setDrivers(initialDrivers);
        setOrders(initialOrders);
        setDataLoaded(true);
      });
  }, []);

  // Save data on change
  useEffect(() => {
    if (dataLoaded) {
      fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicles, drivers, orders })
      }).catch(err => console.error('Failed to save DB:', err));
    }
  }, [vehicles, drivers, orders, dataLoaded]);

  // Restore a logged-in session from the backend on first load.
  useEffect(() => {
    userService
      .me()
      .then(usr => {
        if (usr) setUser(usr);
      })
      .catch(() => {})
      .finally(() => setSessionChecked(true));
  }, []);

  const handleLogin = (usr) => setUser(usr);

  const handleLogout = () => {
    userService.logout().finally(() => setUser(null));
  };
  
  // Navigation & UI States
  const [activeView, setActiveView] = useState('planner');
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Server Connected', message: 'VROOM solver engine listening successfully.', read: false }
  ]);
  const [settings, setSettings] = useState({
    companyName: 'VROOM India Logistics',
    currency: 'INR',
    language: 'en',
    vroomPath: '',
    notiNewOrder: true,
    notiDelay: true,
    notiOffline: true
  });

  // Load theme preference on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Push notifications helper
  const addNotification = (title, message) => {
    setNotifications(prev => [
      { id: Date.now(), title, message, read: false },
      ...prev
    ]);
  };

  // Vehicles CRUD
  const handleAddVehicle = (vehicleData) => {
    const newId = vehicles.length > 0 ? Math.max(...vehicles.map(v => v.id)) + 1 : 0;
    const colors = ['#6366f1', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#3b82f6', '#ef4444'];
    const newVehicle = {
      ...vehicleData,
      id: newId,
      color: colors[newId % colors.length],
      // Default positions to New York City center if empty
      start: vehicles[0]?.start || [40.7580, -73.9855],
      end: vehicles[0]?.end || [40.7580, -73.9855]
    };
    setVehicles([...vehicles, newVehicle]);
    addNotification('Vehicle Registered', `${newVehicle.name} added to the fleet.`);
  };

  const handleEditVehicle = (id, vehicleData) => {
    setVehicles(vehicles.map(v => v.id === id ? { ...v, ...vehicleData } : v));
    addNotification('Vehicle Details Updated', `Fleet changes saved for ${vehicleData.name}.`);
  };

  const handleDeleteVehicle = (id) => {
    const deleted = vehicles.find(v => v.id === id);
    setVehicles(vehicles.filter(v => v.id !== id));
    if (deleted) {
      addNotification('Vehicle Retired', `${deleted.name} removed from registry.`);
    }
  };

  const handleUpdateVehicleLocation = (id, type, coords) => {
    setVehicles(vehicles.map(v => {
      if (v.id === id) {
        return type === 'start' ? { ...v, start: coords } : { ...v, end: coords };
      }
      return v;
    }));
  };

  // Drivers CRUD
  const handleAddDriver = (driverData) => {
    const newId = drivers.length > 0 ? Math.max(...drivers.map(d => d.id)) + 1 : 1;
    const newDriver = { ...driverData, id: newId };
    setDrivers([...drivers, newDriver]);
    addNotification('Driver Registered', `${newDriver.name} added to operator registry.`);
  };

  const handleEditDriver = (id, driverData) => {
    setDrivers(drivers.map(d => d.id === id ? { ...d, ...driverData } : d));
    addNotification('Driver Profile Updated', `Profile saved for ${driverData.name}.`);
  };

  const handleDeleteDriver = (id) => {
    const deleted = drivers.find(d => d.id === id);
    setDrivers(drivers.filter(d => d.id !== id));
    if (deleted) {
      addNotification('Driver Deregistered', `${deleted.name} removed from registry.`);
    }
  };

  // Orders CRUD
  const handleAddOrder = (orderData) => {
    const newId = orders.length > 0 ? Math.max(...orders.map(o => o.id)) + 1 : 100;
    const newOrder = { ...orderData, id: newId };
    setOrders([...orders, newOrder]);
    if (settings.notiNewOrder) {
      addNotification('New Order Cataloged', `Order #${newId} registered for ${newOrder.customer}.`);
    }
  };

  const handleEditOrder = (id, orderData) => {
    setOrders(orders.map(o => o.id === id ? { ...o, ...orderData } : o));
    addNotification('Order Details Updated', `Changes saved for Order #${id}.`);
  };

  const handleDeleteOrder = (id) => {
    setOrders(orders.filter(o => o.id !== id));
    addNotification('Order Canceled', `Order #${id} removed from queue.`);
  };

  // VROOM API Payload builder & calling solver
  const runOptimization = async () => {
    if (vehicles.length === 0 || orders.length === 0) {
      alert("Please add at least one vehicle and one order.");
      return;
    }

    addNotification('Optimizing Routes', 'Querying VROOM solver with driving matrices...');

    try {
      // 1. Map locations to indices
      const uniqueCoords = [];
      const coordToIdx = new Map();

      function getIndex(coord) {
        const key = `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`;
        if (coordToIdx.has(key)) return coordToIdx.get(key);
        const idx = uniqueCoords.length;
        uniqueCoords.push(coord);
        coordToIdx.set(key, idx);
        return idx;
      }

      const vroomVehicles = vehicles.map(v => ({
        id: v.id,
        start_index: getIndex(v.start),
        end_index: getIndex(v.end),
        capacity: v.capacity
      }));

      const vroomJobs = orders.map(o => ({
        id: o.id,
        location_index: getIndex(o.location),
        demand: o.demand,
        service: o.service
      }));

      // 2. Fetch real driving durations from Google Distance Matrix API if key is loaded
      let durations = [];
      const size = uniqueCoords.length;
      
      // Setup default fallback straight-line calculation
      const calculateFallbackMatrix = () => {
        const matrix = Array(size).fill(0).map(() => Array(size).fill(0));
        for (let i = 0; i < size; i++) {
          for (let j = 0; j < size; j++) {
            if (i === j) {
              matrix[i][j] = 0;
            } else {
              const p1 = uniqueCoords[i];
              const p2 = uniqueCoords[j];
              const dy = p2[0] - p1[0];
              const dx = p2[1] - p1[1];
              const dist = Math.sqrt(dx*dx + dy*dy);
              // Rough seconds estimate (straight-line approximation)
              matrix[i][j] = Math.round(dist * 11100 * 2.4);
            }
          }
        }
        return matrix;
      };

      // Fetch a real driving duration matrix along actual roads (Indian road
      // data via free OSRM public server). Falls back to straight-line
      // estimates if the service is unavailable.
      const OSRM_TABLE = 'https://router.project-osrm.org/table/v1/driving';
      let matrixFetched = false;
      try {
        if (size > 0) {
          const coordStr = uniqueCoords
            .map(c => `${c[1].toFixed(6)},${c[0].toFixed(6)}`)
            .join(';');
          const res = await fetch(
            `${OSRM_TABLE}/${coordStr}?annotations=duration`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.code === 'Ok' && data.durations) {
              durations = data.durations.map(row =>
                row.map(v => Math.round(v * 1.3)) // add ~30% for traffic/real-world
              );
              matrixFetched = true;
            } else {
              durations = calculateFallbackMatrix();
            }
          } else {
            durations = calculateFallbackMatrix();
          }
        }
      } catch (err) {
        console.warn('OSRM table unavailable, using fallback matrix:', err);
      }
      // Guarantee a valid matrix if OSRM did not succeed.
      if (!matrixFetched) {
        durations = calculateFallbackMatrix();
      }

      // 3. Assemble VROOM Payload
      const payload = {
        vehicles: vroomVehicles,
        jobs: vroomJobs,
        matrices: {
          car: {
            durations: durations
          }
        }
      };

      // 4. Send POST to local VROOM-Express server
      const response = await fetch('/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Optimization failed.');
      }

      const sol = await response.json();
      setSolution(sol);
      addNotification('Optimization Succeeded', `Active dispatch plan generated in ${sol.summary.computing_times.solving}ms.`);
      
      // Update local orders status based on assignment
      const assignedIds = new Set();
      sol.routes.forEach(route => {
        route.steps.forEach(step => {
          if (step.type === 'job') assignedIds.add(step.id);
        });
      });
      setOrders(orders.map(o => assignedIds.has(o.id) ? { ...o, status: 'dispatched' } : o));

    } catch (err) {
      console.error(err);
      addNotification('Optimization Error', err.message);
      alert(`Optimization Solver Failed: ${err.message}`);
    }
  };

  if (!sessionChecked) {
    return (
      <ThemeProvider theme={muiTheme}>
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(1000px 500px at 30% -10%, #1e2a52 0%, #0b0f19 60%)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ display: 'inline-flex', p: 1.3, borderRadius: '14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 6px 24px rgba(99,102,241,0.5)' }}>
              <Navigation size={22} color="white" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>VROOM India</Typography>
          </Box>
        </Box>
      </ThemeProvider>
    );
  }

  if (!user) {
    return <ThemeProvider theme={muiTheme}><AuthView onLogin={handleLogin} /></ThemeProvider>;
  }

  return (
    <ThemeProvider theme={muiTheme}>
    <Layout
      activeView={activeView}
      onViewChange={setActiveView}
      theme={theme}
      onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      user={user}
      onLogout={handleLogout}
      notifications={notifications}
    >
      <Box sx={{ height: '100%', width: '100%' }}>
        {activeView === 'planner' && (
          <RoutePlanner />
        )}

        {activeView === 'profile' && (
          <ProfileView user={user} onUserChange={setUser} />
        )}

        {activeView === 'reportsMap' && (
          <ReportIssueView />
        )}

        {activeView === 'dashboard' && (
          <DashboardView 
            vehicles={vehicles} 
            drivers={drivers} 
            orders={orders} 
            user={user}
          />
        )}

        {activeView === 'map' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 3 }}>
            {/* The Map Panel (OpenStreetMap + Leaflet, free Indian roads) */}
            <Box sx={{ flex: 1, minHeight: 450, position: 'relative', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <MapContainer
                vehicles={vehicles}
                jobs={orders}
                onAddJob={handleAddOrder}
                onUpdateVehicleLocation={handleUpdateVehicleLocation}
                activeRouteSolutions={solution ? solution.routes : []}
              />
            </Box>

            {/* Run Solver CTA */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <button 
                onClick={runOptimization} 
                style={{ 
                  flex: 1, 
                  padding: '14px', 
                  fontFamily: 'inherit',
                  fontWeight: 700,
                  fontSize: '16px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
                }}
              >
                ⚡ Optimize Fleet Routes (Avoid Traffic & Save Fuel)
              </button>
              {solution && (
                <button 
                  onClick={() => {
                    setSolution(null);
                    setOrders(orders.map(o => o.status === 'dispatched' ? { ...o, status: 'pending' } : o));
                    addNotification('Routes Reset', 'Route solver logs cleared.');
                  }}
                  style={{ 
                    padding: '0 24px', 
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    background: 'rgba(244, 63, 94, 0.1)',
                    color: '#f43f5e',
                    border: '1px solid #f43f5e',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer'
                  }}
                >
                  Reset Routes
                </button>
              )}
            </Box>

            {/* Stop Sequence steps table */}
            <SolutionTable 
              solution={solution} 
              vehicles={vehicles} 
              orders={orders} 
            />
          </Box>
        )}

        {activeView === 'vehicles' && (
          <VehicleManagement
            vehicles={vehicles}
            drivers={drivers}
            onAdd={handleAddVehicle}
            onEdit={handleEditVehicle}
            onDelete={handleDeleteVehicle}
          />
        )}

        {activeView === 'drivers' && (
          <DriverManagement
            drivers={drivers}
            vehicles={vehicles}
            onAdd={handleAddDriver}
            onEdit={handleEditDriver}
            onDelete={handleDeleteDriver}
          />
        )}

        {activeView === 'orders' && (
          <OrderManagement
            orders={orders}
            onAdd={handleAddOrder}
            onEdit={handleEditOrder}
            onDelete={handleDeleteOrder}
          />
        )}

        {activeView === 'tracking' && (
          <LiveTracking
            vehicles={vehicles}
            drivers={drivers}
            orders={orders}
            solution={solution}
          />
        )}

        {activeView === 'reports' && (
          <ReportsView
            vehicles={vehicles}
            drivers={drivers}
            orders={orders}
            solution={solution}
          />
        )}

        {activeView === 'settings' && (
          <SettingsView
            settings={settings}
            onSaveSettings={(data) => setSettings({ ...settings, ...data })}
          />
        )}
      </Box>
    </Layout>
    </ThemeProvider>
  );
}
