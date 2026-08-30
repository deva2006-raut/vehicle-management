// GeocodingService — provider-agnostic forward/reverse geocoding.
//
// Currently backed by OpenStreetMap's public Nominatim service (free, no API
// key, good Indian city/address/landmark coverage). To use a different
// provider later (Mapbox, Google, custom), implement the same interface here
// without touching the UI.

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'vroom-india-dashboard/1.0'
};

// Bounding boxes for major Indian cities — used to filter search results to a
// chosen area via Nominatim's viewbox + bounded options. Format: "lon,lat,lon,lat"
const CITY_BOUNDS = {
  delhi: { label: 'Delhi NCR', viewbox: '76.80,28.90,77.35,28.40', suggest: 'delhi' },
  mumbai: { label: 'Mumbai', viewbox: '72.70,19.30,73.10,18.85', suggest: 'mumbai' },
  bengaluru: { label: 'Bengaluru', viewbox: '77.35,13.15,77.75,12.80', suggest: 'bengaluru' },
  hyderabad: { label: 'Hyderabad', viewbox: '78.30,17.60,78.65,17.20', suggest: 'hyderabad' },
  chennai: { label: 'Chennai', viewbox: '80.10,13.25,80.35,12.85', suggest: 'chennai' },
  kolkata: { label: 'Kolkata', viewbox: '88.20,22.70,88.50,22.40', suggest: 'kolkata' },
  pune: { label: 'Pune', viewbox: '73.70,18.70,74.05,18.40', suggest: 'pune' },
  ahemdabad: { label: 'Ahmedabad', viewbox: '72.50,23.15,72.75,22.95', suggest: 'ahmedabad' },
  jaipur: { label: 'Jaipur', viewbox: '75.70,27.05,75.90,26.80', suggest: 'jaipur' },
  lucknow: { label: 'Lucknow', viewbox: '80.80,26.95,81.05,26.70', suggest: 'lucknow' }
};

export const CITY_AREAS = Object.entries(CITY_BOUNDS).map(
  ([key, v]) => ({ id: key, label: v.label })
);

// Turn a place object from Nominatim into a normalized suggestion used by the UI.
function normalizeSuggestion(place) {
  const types = place.type || 'amenity';
  return {
    id: `${types}-${place.osm_id || place.place_id}-${place.lat}-${place.lon}`,
    label: place.display_name,
    name: place.display_name.split(',')[0],
    address: place.display_name,
    lat: parseFloat(place.lat),
    lng: parseFloat(place.lon),
    type,
    category: place.category,
    city:
      (place.address && (place.address.city || place.address.town || place.address.village)) ||
      undefined,
    state: place.address && place.address.state,
    country: place.address && place.address.country
  };
}

export const geocodingService = {
  /**
   * Forward geocoding — search for an address / city / landmark.
   * @param {string} query
   * @param {{limit?: number, viewbox?: string, bounded?: boolean, city?: string}} options
   * @returns {Promise<Array>}
   */
  async search(query, options = {}) {
    if (!query || !query.trim()) return [];
    const limit = options.limit || 8;
    let rawQuery = query.trim();
    const params = new URLSearchParams({
      format: 'jsonv2',
      q: rawQuery,
      limit: String(limit),
      'accept-language': 'hi,en'
    });
    // Optional area filter: restrict + bias results to a selected Indian city.
    if (options.city && CITY_BOUNDS[options.city]) {
      const b = CITY_BOUNDS[options.city];
      params.set('viewbox', b.viewbox);
      params.set('bounded', '1');
      // Bias the geocoder toward that city when the query has no other region hint.
      if (!/,(?:delhi|maharashtra|mumbai|karnataka|telangana|tamil|west bengal|pune|gujarat|rajasthan|uttar)/i.test(rawQuery)) {
        params.set('q', `${rawQuery}, ${b.suggest}`);
      }
    }
    // Restrict to reasonably India-relevant bounds to sort higher.
    if (options.viewbox) params.set('viewbox', options.viewbox);
    if (options.bounded) params.set('bounded', '1');

    const res = await fetch(`${NOMINATIM_BASE}/search?${params.toString()}`, {
      headers: DEFAULT_HEADERS
    });
    if (!res.ok) throw new Error('Geocoding search failed');
    const data = await res.json();
    return (data || []).map(normalizeSuggestion);
  },

  /**
   * Reverse geocoding — get an address for a coordinate.
   * @param {number} lat
   * @param {number} lng
   * @returns {Promise<string>} display address
   */
  async reverse(lat, lng) {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(lat),
      lon: String(lng),
      zoom: '18',
      'accept-language': 'hi,en'
    });
    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params.toString()}`, {
      headers: DEFAULT_HEADERS
    });
    if (!res.ok) throw new Error('Reverse geocoding failed');
    const data = await res.json();
    return data.display_name || `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
  },

  /**
   * Suggest a short label for a saved/favorite location.
   */
  labelFor(place) {
    if (!place) return '';
    return typeof place === 'string' ? place : place.label || place.name || place.address || '';
  }
};

export default geocodingService;
