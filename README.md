# 🚑 Vehicle Management — Smart Fleet & Route Optimization

A **vehicle routing & fleet management platform** that pairs a [VROOM](https://github.com/VROOM-Project/vroom) optimization API with a custom **React dashboard** and a road-report feed for real-world conditions.

> Built on top of [vroom-express](https://github.com/VROOM-Project/vroom-express) (BSD-2-Clause © Julien Coupey) with a custom dashboard and road-report integrations by Devanshu Raut.

## ✨ What it does

- 🧮 **Route optimization** — solve VRP/TSP problems via VROOM through a simple HTTP API
- 📊 **React dashboard** — visualize vehicles, jobs, and optimized routes
- 🛣️ **Road reports** — factor live road conditions (`roadReportApi.js`) into planning
- 👤 **User management** — lightweight JSON-backed user store (`users.json`)
- ❤️ **Health checks** — built-in `/health` endpoint for monitoring

## 🏗️ Architecture

```
┌────────────────────┐     ┌──────────────────────┐
│  dashboard-react   │────▶│  Express API (vroom) │
│  (Vite + React)    │     │  src/index.js:3000   │
└────────────────────┘     └──────────┬───────────┘
                                      │
                       ┌──────────────▼──────────────┐
                       │  VROOM solver + OSRM / ORS  │
                       └─────────────────────────────┘
```

## 🛠️ Tech Stack

| Layer    | Technology                                  |
| -------- | ------------------------------------------- |
| API      | Node.js, Express, Helmet, Morgan            |
| Solver   | VROOM + OSRM / OpenRouteService             |
| Frontend | React (Vite), Leaflet-ready                 |
| Config   | YAML (`config.yml`)                         |

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- A routing engine: [OSRM](https://github.com/Project-OSRM/osrm-backend/wiki/Building-OSRM) or [OpenRouteService](https://github.com/GIScience/openrouteservice/)
- [VROOM](https://github.com/VROOM-Project/vroom/wiki/Building) solver

### Installation

```bash
git clone https://github.com/deva2006-raut/vehicle-management.git
cd vehicle-management
npm install          # also installs & builds the dashboard
```

### Configuration

Adjust `config.yml` for router/port settings. Optionally set:

```bash
VROOM_ROUTER=osrm   # osrm | libosrm | ors | valhalla (overrides config.yml)
```

### Run

```bash
npm start            # API on http://localhost:3000
```

### Verify

```bash
curl -w "%{http_code}" http://localhost:3000/health
# 200
```

### Dashboard

```bash
npm run dashboard:build
```

## 🔌 Example Query

```bash
curl --header "Content-Type:application/json" \
  --data '{"vehicles":[{"id":0,"start":[2.3526,48.8604],"end":[2.3526,48.8604]}],
           "jobs":[{"id":0,"location":[2.3691,48.8532]},{"id":1,"location":[2.2911,48.8566]}],
           "options":{"g":true}}' \
  http://localhost:3000
```

See the [VROOM API documentation](https://github.com/VROOM-Project/vroom/blob/master/docs/API.md) for the full input syntax.

## 📄 License

Dashboard & custom code: **MIT** © 2026 Devanshu Raut.
Upstream vroom-express remains **BSD-2-Clause** © Julien Coupey — see [LICENSE](LICENSE).
