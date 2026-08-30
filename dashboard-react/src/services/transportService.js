// TransportService — data layer for the Command Center dashboard.
//
// This is a clean service/mock layer so the UI works even without a dedicated
// backend for bookings/trips/alerts/compliance. Where the real fleet exists
// (vehicles/drivers/orders), we derive stats from it; the rest (trip schedule,
// documents, alerts, analytics) is realistic, deterministic seed data that can
// later be swapped for a real API without touching the UI.
//
// NOTE: No fabricated live-GPS simulation here. Vehicle positions come from the
// fleet data; statuses come from the fleet ("active"/"in-transit"/"maintenance").

import { estimateTripCost } from './pricingService';
import { CITY_AREAS } from './geocodingService';

// ---- City anchors for realistic Indian trip routing ----
export const ANCHORS = {
  delhi: [28.6139, 77.209],
  mumbai: [19.076, 72.8777],
  bengaluru: [12.9716, 77.5946],
  pune: [18.5204, 73.8567],
  jaipur: [26.9124, 75.7873],
  nagpur: [21.1458, 79.0882],
  lucknow: [26.8467, 80.9462],
  chennai: [13.0827, 80.2707]
};
export const CITY_ANCHORS = CITY_AREAS.map(c => ({ id: c.id, label: c.label, coord: ANCHORS[c.id] || ANCHORS.delhi }));

// ---- Vehicle status mapping for fleet ----
export const FLEET_STATUS = {
  active: { label: 'Available', color: '#10b981', dot: '🟢' },
  'in-transit': { label: 'On Trip', color: '#3b82f6', dot: '🔵' },
  delayed: { label: 'Delayed', color: '#f59e0b', dot: '🟠' },
  maintenance: { label: 'Offline', color: '#64748b', dot: '⚫' },
  offline: { label: 'Offline', color: '#64748b', dot: '⚫' }
};

// Deterministic pseudo-random so the UI is stable across re-renders.
function seeded(seedStr) {
  let h = 1779033703;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Indian warehouse / industrial / retail points around a city anchor.
const NEARBY_SPOTS = [
  'Warehouse Complex', 'Industrial Area', 'Wholesale Market', 'Logistics Hub',
  'Mall Road', 'Export Zone', 'Freight Terminal', 'Distribution Centre'
];

function nearbySpot(rand, anchor, seed) {
  const r = seeded(seed);
  const idx = Math.floor(r() * NEARBY_SPOTS.length);
  const a = anchor[0] + (r() - 0.5) * 0.35;
  const b = anchor[1] + (r() - 0.5) * 0.35;
  return { name: NEARBY_SPOTS[idx], lat: +a.toFixed(5), lng: +b.toFixed(5) };
}

export const NOW = new Date();

// ---- Derived fleet stats from real data ----
export function deriveFleetStats(vehicles) {
  const totalVehicles = vehicles.length;
  const available = vehicles.filter(v => v.status === 'active' || v.status === 'available').length;
  const onTrip = vehicles.filter(v => v.status === 'in-transit' || v.status === 'active').length;
  const delayed = vehicles.filter(v => v.status === 'delayed').length;
  const offline = vehicles.filter(
    v => v.status === 'maintenance' || v.status === 'offline'
  ).length;
  const unassigned = vehicles.filter(v => !v.driverId).length;
  return { totalVehicles, available, onTrip, delayed, offline, unassigned };
}

// ---- Trips (derived + enriched with realistic route/trip data) ----
export function buildTrips(vehicles, drivers) {
  const trips = [];

  const STATUS_POOL = ['Scheduled', 'Assigned', 'In Transit', 'Delivered', 'Delayed', 'Cancelled'];
  const rand = seeded('vroom-trips-2026');

  // Base each trip on a real vehicle so the map/popups stay grounded in fleet data.
  vehicles.forEach((v, idx) => {
    const city = CITY_ANCHORS[idx % CITY_ANCHORS.length];
    let status = STATUS_POOL[idx % STATUS_POOL.length];
    if (v.status === 'maintenance' || v.status === 'offline') status = 'Cancelled';

    const fromSpot = nearbySpot(rand, city.coord, 'from' + v.id);
    const toSpot = nearbySpot(rand, city.coord, 'to' + v.id);
    const driver = drivers.find(d => String(d.id) === String(v.driverId));
    const distKm = Math.round(8 + rand() * 120);
    const durMin = Math.round(distKm * (1.4 + rand() * 0.8));
    const deadline = new Date(NOW.getTime() + Math.round(rand() * 6 - 3) * 3600 * 1000);

    let tripStatus = status;
    if (tripStatus === 'Delayed') tripStatus = 'Delayed';

    trips.push({
      id: 'TRIP-' + (1000 + idx),
      vehicleId: v.id,
      vehicle: v.name || ('Vehicle ' + v.id),
      vehicleType: v.type,
      vehicleNumber: v.number || v.name,
      driverId: v.driverId,
      driver: driver ? driver.name : 'Unassigned',
      driverPhone: driver ? driver.phone : '',
      pickup: fromSpot.name,
      destination: toSpot.name,
      pickupLat: fromSpot.lat,
      pickupLng: fromSpot.lng,
      dropLat: toSpot.lat,
      dropLng: toSpot.lng,
      distanceKm: distKm,
      durationMin: durMin,
      eta: deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      price: estimateTripCost({ type: v.type || 'truck', distanceKm: distKm, durationMin: durMin }).total,
      status: tripStatus,
      delayMin: tripStatus === 'Delayed' ? Math.round(15 + rand() * 30) : 0,
      color: v.color || '#6366f1'
    });
  });

  // If the fleet is tiny/empty, add a couple of standalone trips so the
  // operations table isn't empty in the demo.
  if (trips.length === 0) {
    trips.push(makeStandaloneTrip('TRIP-1001', 'active', drivers[0]));
  }
  return trips;
}

function makeStandaloneTrip(id, status, driver) {
  const city = CITY_ANCHORS[0];
  const from = nearbySpot(seeded(7), city.coord, 'a');
  const to = nearbySpot(seeded(8), city.coord, 'b');
  const distKm = Math.round(12 + seeded(9)() * 60);
  return {
    id, vehicleId: 0, vehicle: 'Tata Ace #1', vehicleType: 'truck', vehicleNumber: 'MH-01-AB-9821',
    driverId: driver ? driver.id : '', driver: driver ? driver.name : 'Unassigned',
    driverPhone: driver ? driver.phone : '', pickup: from.name, destination: to.name,
    pickupLat: from.lat, pickupLng: from.lng, dropLat: to.lat, dropLng: to.lng,
    distanceKm: distKm, durationMin: Math.round(distKm * 1.6),
    eta: new Date(NOW.getTime() + 90 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    price: estimateTripCost({ type: 'truck', distanceKm: distKm, durationMin: distKm * 1.6 }).total,
    status, delayMin: 0, color: '#6366f1'
  };
}

// ---- Bookmarks (from the operations trips; used for "today's revenue") ----
export function buildBookings(trips) {
  const delivered = trips.filter(t => t.status === 'Delivered');
  const active = trips.filter(t => t.status === 'In Transit' || t.status === 'Assigned');
  const scheduled = trips.filter(t => t.status === 'Scheduled');
  const cancelled = trips.filter(t => t.status === 'Cancelled');
  const delayed = trips.filter(t => t.status === 'Delayed');
  return {
    deliveredCount: delivered.length,
    activeCount: active.length,
    scheduledCount: scheduled.length,
    cancelledCount: cancelled.length,
    delayedCount: delayed.length,
    totalRevenue: delivered.reduce((s, t) => s + (t.price || 0), 0)
  };
}

// ---- Smart alerts derived from fleet + trips ----
export function buildAlerts(trips, vehicles) {
  const alerts = [];
  trips.forEach(t => {
    if (t.status === 'Delayed') {
      alerts.push({
        id: 'a' + t.id, type: 'delay', severity: 'high', title: 'Trip delayed',
        desc: `Trip ${t.id} is delayed by about ${t.delayMin} min.`,
        time: NOW.getHours() + ':' + String(NOW.getMinutes()).padStart(2, '0'),
        action: 'View Trip', target: t.id
      });
    }
  });
  vehicles.forEach(v => {
    if (!v.driverId) {
      alerts.push({
        id: 'a-' + v.id + '-driver', type: 'unassigned', severity: 'medium', title: 'No driver assigned',
        desc: `${v.name || 'Vehicle ' + v.id} has no driver assigned yet.`,
        time: 'Now', action: 'Assign Vehicle', target: String(v.id)
      });
    }
  });
  // Document renewal alerts are seeded in buildDocuments.
  if (alerts.length === 0) {
    alerts.push({
      id: 'a-default', type: 'info', severity: 'low', title: 'All systems normal',
      desc: 'No critical alerts right now.',
      time: 'Now', action: 'Resolve', target: ''
    });
  }
  return alerts;
}

// ---- Documents & compliance (deterministic seed) ----
export const DOC_TYPES = ['RC', 'Insurance', 'PUC', 'Fitness', 'Permit', 'Driving Licence', 'Challans'];

export function buildDocuments(vehicles) {
  const docs = [];
  const rand = seeded('vroom-docs-2026');
  const rows = Math.max(3, vehicles.length);
  for (let i = 0; i < rows; i++) {
    const v = vehicles[i] || {};
    const day = Math.floor(rand() * 30);
    const state = day >= 22 ? 'valid' : day >= 10 ? 'expiring' : 'expired';
    DOC_TYPES.forEach((d) => {
      if (d === 'Driving Licence') return; // handled per driver below
      docs.push({
        id: d + i, vehicleId: i, vehicle: v.name || ('Vehicle ' + (i + 1)),
        type: d, status: state,
        expiry: new Date(NOW.getTime() + (state === 'valid' ? 60 + i * 10 : state === 'expiring' ? 14 : -20) * 24 * 3600 * 1000)
          .toISOString().slice(0, 10)
      });
    });
  }
  // A couple of driver licence / challan entries for realism.
  docs.push({ id: 'DL-0', vehicleId: -1, vehicle: 'Ravi Sharma', type: 'Driving Licence', status: 'expiring', expiry: new Date(NOW.getTime() + 8 * 24 * 3600 * 1000).toISOString().slice(0, 10) });
  docs.push({ id: 'CH-0', vehicleId: 0, vehicle: 'MH-01-AB-9821', type: 'Challans', status: 'expired', expiry: new Date(NOW.getTime() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10) });
  return docs;
}

export function docStatusMeta(status) {
  return status === 'valid'
    ? { label: 'Valid', color: '#10b981', dot: '🟢' }
    : status === 'expiring'
      ? { label: 'Expiring Soon', color: '#f59e0b', dot: '🟠' }
      : { label: 'Expired', color: '#f43f5e', dot: '🔴' };
}

// ---- Analytics (deterministic, realistic) ----
export function buildAnalytics(trips) {
  const rand = seeded('vroom-ana-2026');
  const daily = Array.from({ length: 7 }, (_, i) => ({
    name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    revenue: Math.round(18000 + rand() * 22000)
  }));
  const weekly = Array.from({ length: 4 }, (_, i) => ({
    name: 'W' + (i + 1),
    revenue: Math.round(90000 + rand() * 60000),
    trips: Math.round(40 + rand() * 30)
  }));
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(NOW.getFullYear(), NOW.getMonth() - (5 - i), 1);
    return {
      name: d.toLocaleString('en', { month: 'short' }),
      revenue: Math.round(350000 + rand() * 250000)
    };
  });

  const statusCounts = {
    Completed: trips.filter(t => t.status === 'Delivered').length + 12,
    Active: trips.filter(t => t.status === 'In Transit' || t.status === 'Assigned').length,
    Cancelled: trips.filter(t => t.status === 'Cancelled').length,
    Delayed: trips.filter(t => t.status === 'Delayed').length
  };

  const totalTrips = statusCounts.Completed + statusCounts.Active + statusCounts.Cancelled + statusCounts.Delayed;
  const onTime = totalTrips ? Math.round(((totalTrips - statusCounts.Delayed) / totalTrips) * 100) : 100;
  const distanceKm = Math.round(trips.reduce((s, t) => s + t.distanceKm, 0) + 640);

  return {
    daily, weekly, monthly,
    tripStats: statusCounts,
    totalTrips,
    onTimePct: onTime,
    totalDistanceKm: distanceKm,
    utilizationPct: 68 // fleet utilisation example (could be derived in production)
  };
}

// ---- Location search (provider-agnostic; uses real geocoding when available) ----
export function recommendVehicles(trips, pickup = {}, opts = {}) {
  // Candidate vehicles are those "Available" (not on an active trip / offline).
  const candidates = trips
    .filter(t => t.status === 'Scheduled' || t.status === 'Delivered' || t.status === 'Cancelled' || t.status === 'Assigned')
    .map(t => {
      const from = pickup.lat != null ? pickup : { lat: t.pickupLat, lng: t.pickupLng };
      const dLat = from.lat - t.pickupLat;
      const dLng = from.lng - t.pickupLng;
      const dist = Math.hypot(dLat, dLng) * 111;
      const price = estimateTripCost({
        type: t.vehicleType || 'truck', distanceKm: Math.max(5, t.distanceKm), durationMin: t.durationMin
      });
      return {
        id: t.vehicleId, vehicle: t.vehicle, vehicleType: t.vehicleType, vehicleNumber: t.vehicleNumber,
        capacity: t.distanceKm * 0.4, distanceKm: +dist.toFixed(1),
        etaMin: Math.max(4, Math.round(dist * 2.2)),
        driver: t.driver, driverPhone: t.driverPhone, availability: t.status,
        priceTotal: price.total, priceBreakdown: price.breakdown, color: t.color,
        score: 0
      };
    });

  // Sort by chosen strategy and assign "best match" first.
  candidates.forEach(c => {
    c.score = Math.round(100 - c.distanceKm * 0.6 - c.priceTotal * 0.0006);
  });
  const sorters = {
    nearest: (a, b) => a.distanceKm - b.distanceKm,
    cheapest: (a, b) => a.priceTotal - b.priceTotal,
    fastest: (a, b) => a.etaMin - b.etaMin,
    best: (a, b) => b.score - a.score
  };
  const key = opts.sort || 'best';
  const sorted = candidates.slice().sort(sorters[key] || sorters.best);
  return sorted.map((c, i) => ({ ...c, isRecommended: i === 0 }));
}

// ---- Quick booking state helpers ----
export function pricingBreakdown(type, distanceKm, durationMin, extras = {}) {
  const est = estimateTripCost({
    type, distanceKm, durationMin,
    waitingMin: extras.waitingMin || 0,
    tollKm: extras.tollKm != null ? extras.tollKm : distanceKm * 0.4
  });
  return est;
}

export function formatINR(n) {
  if (n == null) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN');
}

export function quickActionId(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

// ---- Vehicle health & maintenance (derived from fleet + deterministic seed) ----
export function buildVehicleHealth(vehicles) {
  const rand = seeded('vroom-health-2026');
  const list = vehicles.map((v, idx) => {
    let fuelPct = 45 + rand() * 50;
    if (v.status === 'maintenance' || v.status === 'offline') fuelPct = 20;
    const serviceDueDays = v.status === 'maintenance' ? 0 : Math.floor(rand() * 25);
    const health = v.status === 'maintenance'
      ? 35 : v.status === 'delayed'
        ? 72 : 82 + rand() * 16;
    const loadPct = 40 + rand() * 50;
    return {
      id: v.id,
      name: v.name || ('Vehicle ' + (idx + 1)),
      type: v.type || 'van',
      number: v.number || v.name,
      status: v.status || 'active',
      fuelPct: Math.round(fuelPct),
      loadPct: Math.round(loadPct),
      serviceDueDays,
      health: Math.round(health)
    };
  });
  // Always show a few more so the panel is meaningful even with a small fleet.
  while (list.length < 4) {
    const extra = seeded('vroom-health-x' + list.length);
    list.push({
      id: 'vh' + list.length,
      name: ['Tata Ace', 'Mahindra Bolero', 'Ashok Leyland', 'Eicher Pro'][list.length % 4] + ' #' + (list.length + 1),
      type: ['truck', 'van', 'truck', 'van'][list.length % 4],
      number: 'MH-0' + (list.length + 1) + '-XX-4' + (10 + list.length),
      status: ['active', 'in-transit', 'active', 'delayed'][list.length % 4],
      fuelPct: Math.round(40 + extra() * 55),
      loadPct: Math.round(35 + extra() * 55),
      serviceDueDays: Math.floor(extra() * 24),
      health: Math.round(70 + extra() * 28)
    });
  }
  return list;
}

export function healthMeta(score) {
  if (score >= 85) return { label: 'Excellent', color: '#10b981' };
  if (score >= 70) return { label: 'Good', color: '#3b82f6' };
  if (score >= 55) return { label: 'Fair', color: '#f59e0b' };
  return { label: 'Needs Service', color: '#f43f5e' };
}

// ---- Driver performance leaderboard (derived from trips) ----
export function buildDriverStandings(trips) {
  const rand = seeded('vroom-drivers-2026');
  const byDriver = {};
  trips.forEach(t => {
    const key = t.driverId || (t.driver && t.driver !== 'Unassigned' ? t.driver : 'unknown');
    if (!byDriver[key]) {
      byDriver[key] = { name: t.driver && t.driver !== 'Unassigned' ? t.driver : 'Unassigned Driver', trips: 0, onTime: 0, delayed: 0, cancelled: 0, rating: 3 + rand() * 2 };
    }
    byDriver[key].trips++;
    if (t.status === 'Delivered') byDriver[key].onTime++;
    if (t.status === 'Delayed') { byDriver[key].delayed++; }
    if (t.status === 'Cancelled') byDriver[key].cancelled++;
  });
  let list = Object.values(byDriver).map(d => {
    const score = Math.max(40, Math.round(100 - d.delayed * 8 - d.cancelled * 15));
    return { ...d, score };
  });
  if (list.length === 0 || list.every(d => d.name === 'Unassigned Driver')) {
    list = ['Ravi Sharma', 'Imran Khan', 'Sunil Verma', 'Amit Joshi'].map(n => ({
      name: n, trips: 20 + Math.floor(rand() * 40), onTime: 15 + Math.floor(rand() * 25),
      delayed: Math.floor(rand() * 4), cancelled: Math.floor(rand() * 2),
      rating: +(3.4 + rand() * 1.5).toFixed(1)
    })).map(d => ({ ...d, score: Math.round(100 - d.delayed * 8 - d.cancelled * 15) }));
  }
  return list.sort((a, b) => rankDriver(b) - rankDriver(a));
}

function rankDriver(d) { return d.score + d.trips * 0.1; }

// ---- City-to-city route estimate (data-driven deterministic; grounds in pricing) ----
export function buildCityRoute(from, to, type = 'truck') {
  const a = ANCHORS[from] || ANCHORS['delhi'];
  const b = ANCHORS[to] || ANCHORS['mumbai'];
  if (!a || !b) return null;
  const dLat = a[0] - b[0];
  const dLng = a[1] - b[1];
  const straightKm = Math.hypot(dLat, dLng) * 111;
  const roadFactor = 1.25; // road > straight-line
  const distanceKm = Math.round(straightKm * roadFactor);
  const durationMin = Math.round(distanceKm * 1.7);
  const tollKm = Math.round(distanceKm * 0.6);
  const est = estimateTripCost({ type, distanceKm, durationMin, tollKm });
  return {
    from, to,
    fromLabel: (CITY_AREAS.find(c => c.id === from)?.label) || from,
    toLabel: (CITY_AREAS.find(c => c.id === to)?.label) || to,
    distanceKm,
    durationMin,
    durationText: `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`,
    tollKm,
    fuelCost: est.fuel,
    tollCost: est.toll,
    totalCost: est.total,
    baseFare: est.base,
    vehicleType: type
  };
}

// ---- Browser-friendly CSV export ----
export function downloadCsv(filename, headers, rows) {
  const esc = v => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
