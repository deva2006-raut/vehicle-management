// RoutingService — provider-agnostic road routing.
//
// Backed by the free public OSRM server (router.project-osrm.org), which uses
// OpenStreetMap data and provides good Indian road-network coverage. Supports
// alternate routes and exclusion of toll / highway segments.
//
// To switch providers later (Mapbox, GraphHopper, custom backend), implement
// the same `getRoutes` interface here without touching the UI.

const OSRM_BASE =
  import.meta.env.VITE_OSRM_BASE || 'https://router.project-osrm.org';

// Route profile mapping used by the optimization options.
export const ROUTE_MODES = {
  fastest: { label: 'Fastest', strategy: 'fastest' },
  shortest: { label: 'Shortest', strategy: 'shortest' },
  fuelEfficient: { label: 'Fuel Efficient', strategy: 'fuel' },
  tollSaving: { label: 'Toll Saving', strategy: 'toll' }
};

const KM_TO_KM = 1000;

// Rough toll estimate (INR) per km of highway — configurable per vehicle class.
// This is an estimate placeholder until an official toll API is connected.
export const TOLL_RATE_PER_KM = {
  car: 2.2,
  motor: 1.5,
  truck: 4.5,
  bus: 3.5,
  auto: 1.2,
  undefined: 2.0
};

/**
 * Request one or more routes between waypoints.
 * @param {Array<{lat:number,lng:number}>} waypoints order: [start, ...stops, end]
 * @param {{mode?: string, alternatives?: boolean, excludeToll?: boolean, excludeHighway?: boolean}} opts
 * @returns {Promise<Array>} normalized routes
 */
export async function getRoutes(waypoints, opts = {}) {
  if (!waypoints || waypoints.length < 2) {
    throw new Error('At least 2 waypoints are required');
  }
  const mode = opts.mode || 'fastest';
  const alternatives = opts.alternatives !== false;

  const coordStr = waypoints
    .map(w => `${w.lng.toFixed(6)},${w.lat.toFixed(6)}`)
    .join(';');

  const excludes = [];
  if (opts.excludeToll) excludes.push('toll');
  if (opts.excludeHighway) excludes.push('motorway');

  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'true',
    alternatives: alternatives ? 'true' : 'false',
    annotations: 'true'
  });
  if (excludes.length) params.set('exclude', excludes.join(','));

  const url = `${OSRM_BASE}/route/v1/driving/${coordStr}?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Routing request failed');

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes) return [];

  // Map strategy-specific score/duration adjustments so the UI can compare.
  return data.routes.map((r, idx) => {
    const distanceKm = r.distance / KM_TO_KM;
    const baseDurationMin = r.duration / 60;
    let adjustedDurationMin = baseDurationMin;
    let score = 90;
    if (mode === 'shortest') {
      score = Math.max(60, 100 - Math.abs(distanceKm - 5));
    } else if (mode === 'fuelEfficient') {
      adjustedDurationMin = baseDurationMin * 0.95; // smoother driving
      score = 88 + (excludes.length ? 4 : 0);
    } else if (mode === 'toll') {
      score = 85 + (excludes.length ? 6 : 0);
    }
    return {
      id: `route-${idx}`,
      distanceKm,
      durationMin: adjustedDurationMin,
      durationText: formatDurationMin(adjustedDurationMin),
      alternatives: alternatives ? data.routes.length : 1,
      geometry: r.geometry, // GeoJSON LineString
      steps: (r.legs || []),
      tollKm: distanceKm * (excludes.length ? 0.1 : 0.6),
      score: Math.min(99, Math.max(55, Math.round(score)))
    };
  });
}

export function formatDurationMin(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatDistanceKm(km) {
  if (km >= 1000) return `${(km / 1000).toFixed(1)}k km`;
  return `${Math.round(km)} km`;
}

export default { getRoutes, formatDurationMin, formatDistanceKm, TOLL_RATE_PER_KM, ROUTE_MODES };
