import React, { useState, useRef, useCallback, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Card, TextField, Button, Typography, MenuItem, Select, Alert, FormControl, InputLabel } from '@mui/material';
import { Search, Navigation } from 'lucide-react';

// Default center for India (New Delhi) so Indian roads show by default
const INDIA_CENTER = [28.6139, 77.209];
const OSM_ROUTING_URL = 'https://router.project-osrm.org';

// Free tile providers (no API key required, full Indian road coverage)
const TILE_PROVIDERS = {
  streets: {
    name: 'Streets (OSM)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  },
  satellite: {
    name: 'Satellite (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19
  },
  hybrid: {
    name: 'Hybrid (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin',
    maxZoom: 19
  },
  terrain: {
    name: 'Terrain (OSM)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenTopoMap (CC-BY-SA)',
    maxZoom: 17
  }
};

// Custom icons to avoid default broken marker assets
function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;color:white;"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

export default function MapContainer({
  vehicles,
  jobs,
  onAddJob,
  onUpdateVehicleLocation,
  activeRouteSolutions
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const routeLayer = useRef(null);
  const baseLayer = useRef(null);

  // Keep the latest callbacks in refs so the map-click handler (attached once)
  // always calls the current onAddJob/onUpdateVehicleLocation.
  const onAddJobRef = useRef(onAddJob);
  const onUpdateLocationRef = useRef(onUpdateVehicleLocation);
  useEffect(() => {
    onAddJobRef.current = onAddJob;
    onUpdateLocationRef.current = onUpdateVehicleLocation;
  }, [onAddJob, onUpdateVehicleLocation]);

  const [mapError, setMapError] = useState(null);
  const [mapType, setMapType] = useState('streets');
  const [searchAddress, setSearchAddress] = useState('');
  const [searching, setSearching] = useState(false);
  const [routing, setRouting] = useState(false);

  // Initialize the map once
  useEffect(() => {
    const map = L.map(mapRef.current, {
      center: INDIA_CENTER,
      zoom: 11,
      zoomControl: true
    });

    baseLayer.current = L.tileLayer(TILE_PROVIDERS.streets.url, {
      attribution: TILE_PROVIDERS.streets.attribution,
      maxZoom: TILE_PROVIDERS.streets.maxZoom
    }).addTo(map);

    markerLayer.current = L.layerGroup().addTo(map);
    routeLayer.current = L.layerGroup().addTo(map);

    mapInstance.current = map;

    // Click on the map adds a new job stop
    map.on('click', handleMapClickLambda);

    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit bounds to show all markers
  const fitBounds = useCallback(() => {
    const map = mapInstance.current;
    if (!map) return;
    const points = [];
    vehicles.forEach(v => {
      if (v.start) points.push(v.start);
      if (v.end) points.push(v.end);
    });
    jobs.forEach(j => {
      if (j.location) points.push(j.location);
    });
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [vehicles, jobs]);

  useEffect(() => {
    fitBounds();
  }, [vehicles, jobs, fitBounds]);

  // Change base layer when map type changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const provider = TILE_PROVIDERS[mapType] || TILE_PROVIDERS.streets;
    if (baseLayer.current) {
      map.removeLayer(baseLayer.current);
    }
    baseLayer.current = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom
    }).addTo(map);
  }, [mapType]);

  // Render markers (depots + jobs)
  useEffect(() => {
    const layer = markerLayer.current;
    if (!layer) return;
    layer.clearLayers();

    const currentUpdateLocation = onUpdateLocationRef.current;

    vehicles.forEach(v => {
      if (v.start) {
        const marker = L.marker(L.latLng(v.start[0], v.start[1]), {
          icon: makeIcon('#10b981'),
          draggable: true,
          zIndexOffset: 1000
        })
          .bindPopup(`<b>${v.name}</b><br/>Start Depot`)
          .addTo(layer);
        marker.on('dragend', e => {
          const c = e.target.getLatLng();
          currentUpdateLocation(v.id, 'start', [c.lat, c.lng]);
        });
      }
      if (v.end) {
        const marker = L.marker(L.latLng(v.end[0], v.end[1]), {
          icon: makeIcon('#f43f5e'),
          draggable: true,
          zIndexOffset: 1000
        })
          .bindPopup(`<b>${v.name}</b><br/>End Depot`)
          .addTo(layer);
        marker.on('dragend', e => {
          const c = e.target.getLatLng();
          currentUpdateLocation(v.id, 'end', [c.lat, c.lng]);
        });
      }
    });

    jobs.forEach((job, index) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:26px;height:26px;border-radius:50%;background:#6366f1;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:white;">${index + 1}</div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      const marker = L.marker(L.latLng(job.location[0], job.location[1]), {
        icon,
        zIndexOffset: 500
      })
        .bindPopup(`<b>${job.customer || 'Job Stop'}</b><br/>${job.description || ''}`)
        .addTo(layer);
      marker.on('click', () => marker.openPopup());
    });
  }, [vehicles, jobs, onUpdateVehicleLocation, activeRouteSolutions]);

  // Fetch & draw real Indian road routes via OSRM for solved VROOM routes
  useEffect(() => {
    const layer = routeLayer.current;
    const map = mapInstance.current;
    if (!layer || !map) return;

    layer.clearLayers();
    if (!activeRouteSolutions || activeRouteSolutions.length === 0) {
      setRouting(false);
      return;
    }
    setRouting(true);

    const fetchRoute = async (route) => {
      const vehicle = vehicles.find(v => v.id === route.vehicle);
      const color = vehicle ? vehicle.color : '#6366f1';
      const coords = [];
      route.steps.forEach(step => {
        if (step.type === 'start') {
          if (vehicle && vehicle.start) coords.push(vehicle.start);
        } else if (step.type === 'end') {
          if (vehicle && vehicle.end) coords.push(vehicle.end);
        } else if (step.type === 'job') {
          const j = jobs.find(x => x.id === step.id);
          if (j && j.location) coords.push(j.location);
        }
      });
      if (coords.length < 2) return;

      const coordStr = coords
        .map(c => `${c[1].toFixed(6)},${c[0].toFixed(6)}`)
        .join(';');
      const url = `${OSM_ROUTING_URL}/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=false`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === 'Ok') {
          const latlngs = data.routes[0].geometry.coordinates.map(c =>
            L.latLng(c[1], c[0])
          );
          L.polyline(latlngs, {
            color,
            weight: 6,
            opacity: 0.85
          }).addTo(layer);
        }
      } catch (err) {
        console.error('OSRM routing failed:', err);
      }
    };

    (async () => {
      for (const route of activeRouteSolutions) {
        await fetchRoute(route);
      }
      setRouting(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRouteSolutions, vehicles, jobs]);

  // Reverse-geocode an address using free OSM Nominatim service
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await res.json();
      return data.display_name || `Stop (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    } catch (err) {
      console.error(err);
      return `Stop (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
    }
  };

  // Map click handler (wrapped so it can be removed)
  const handleMapClickLambda = (e) => {
    const { lat, lng } = e.latlng;
    const map = mapInstance.current;
    if (!map) return;
    if (e.originalEvent.button !== 0 || e.originalEvent.ctrlKey) return;
    reverseGeocode(lat, lng).then(address => {
      onAddJobRef.current({
        location: [lat, lng],
        description: address,
        demand: [10],
        service: 300,
        customer: 'Recipient at Stop',
        phone: '',
        priority: 1,
        status: 'pending'
      });
    });
  };

  // Search an Indian address using Nominatim and fly there + optionally add stop
  const handleSearch = async () => {
    if (!searchAddress.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(searchAddress)}`
      );
      const results = await res.json();
      if (results.length === 0) {
        setMapError(`No location found for "${searchAddress}"`);
        setSearching(false);
        return;
      }
      const place = results[0];
      const lat = parseFloat(place.lat);
      const lng = parseFloat(place.lon);
      const map = mapInstance.current;
      if (map) {
        map.flyTo([lat, lng], 14);
      }
      onAddJobRef.current({
        location: [lat, lng],
        description: place.display_name,
        demand: [10],
        service: 300,
        customer: place.display_name.split(',')[0],
        phone: '',
        priority: 1,
        status: 'pending'
      });
      setSearchAddress('');
      setMapError(null);
    } catch (err) {
      console.error(err);
      setMapError('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Floating Address Search Bar (free OSM search incl. Indian cities) */}
      <Card sx={{
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 1000,
        p: 1.5,
        width: 360,
        backgroundColor: 'var(--bg-secondary)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        gap: 1
      }}>
        <TextField
          fullWidth
          placeholder="Search Indian city / address... (e.g. Connaught Place, Delhi)"
          size="small"
          value={searchAddress}
          onChange={(e) => setSearchAddress(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{
            startAdornment: <Search size={16} style={{ marginRight: 8, color: 'var(--text-muted)' }} />,
            style: { color: 'var(--text-main)', backgroundColor: 'rgba(0,0,0,0.2)' }
          }}
        />
        <Button
          size="small"
          variant="contained"
          onClick={handleSearch}
          disabled={searching}
          sx={{ textTransform: 'none', whiteSpace: 'nowrap', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          {searching ? '...' : 'Find'}
        </Button>
      </Card>

      {/* Floating Map Layer Settings */}
      <Card sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1000,
        p: 1.5,
        backgroundColor: 'var(--bg-secondary)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        minWidth: 140
      }}>
        <FormControl size="small" fullWidth sx={{ minWidth: 130 }}>
          <InputLabel sx={{ color: 'color-mix(in srgb, var(--text-muted) 70%, transparent)' }}>Map View</InputLabel>
          <Select
            value={mapType}
            label="Map View"
            onChange={(e) => setMapType(e.target.value)}
            sx={{ color: 'var(--text-main)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--border-color)' } }}
          >
            <MenuItem value="streets">Streets</MenuItem>
            <MenuItem value="satellite">Satellite</MenuItem>
            <MenuItem value="hybrid">Hybrid</MenuItem>
            <MenuItem value="terrain">Terrain</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Navigation size={12} /> {routing ? 'Fetching routes...' : 'OpenStreetMap'}
        </Typography>
      </Card>

      {mapError && (
        <Alert severity="error" sx={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1000 }}>
          {mapError}
        </Alert>
      )}

      {/* The Leaflet Map (free, includes Indian road data) */}
      <div ref={mapRef} style={{ width: '100%', height: '100%', backgroundColor: '#1d2c4d' }} />
    </Box>
  );
}
