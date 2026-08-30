// RoadProblemReportingModule — real backend for community road reports
// (pothole / accident / road closure / construction / traffic / waterlogging).
//
// Reports live in a dedicated reports.json store so they never collide with
// the fleet data (db.json) or the user store (users.json). Reading is public
// so the map can show markers without requiring a login; creating a report
// requires an authenticated session (same token system as userApi.js).

const fs = require('fs');
const path = require('path');

const REPORTS_DB = path.join(__dirname, '../reports.json');

// Canonical report types + their default display details.
const REPORT_TYPES = {
  pothole: { label: 'Pothole', color: '#f59e0b', icon: '◌' },
  accident: { label: 'Accident', color: '#ef4444', icon: '⚠' },
  closure: { label: 'Road Closure', color: '#8b5cf6', icon: '⊘' },
  construction: { label: 'Construction', color: '#3b82f6', icon: '🚧' },
  traffic: { label: 'Heavy Traffic', color: '#ec4899', icon: '🚦' },
  waterlogging: { label: 'Waterlogging', color: '#06b6d4', icon: '≈' }
};
const VALID_TYPES = Object.keys(REPORT_TYPES);

function seed() {
  if (!fs.existsSync(REPORTS_DB)) {
    fs.writeFileSync(REPORTS_DB, JSON.stringify({ reports: [] }, null, 2));
  }
}

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(REPORTS_DB, 'utf8'));
  } catch (e) {
    return { reports: [] };
  }
}

function writeDB(db) {
  fs.writeFileSync(REPORTS_DB, JSON.stringify(db, null, 2));
}

function json(res, code, body) {
  res.status(code).json(body);
}

module.exports = function mountReportsApi(app, { authUserByToken } = {}) {
  seed();

  // Public: list all reports (optionally filtered by type or status).
  app.get('/api/reports', (req, res) => {
    const db = readDB();
    let reports = db.reports || [];
    if (req.query.type && VALID_TYPES.includes(req.query.type)) {
      reports = reports.filter(r => r.type === req.query.type);
    }
    if (req.query.status) {
      reports = reports.filter(r => r.status === req.query.status);
    }
    return json(res, 200, { reports });
  });

  // Public: fetch a single report.
  app.get('/api/reports/:id', (req, res) => {
    const db = readDB();
    const report = (db.reports || []).find(r => r.id === req.params.id);
    if (!report) return json(res, 404, { error: 'Report not found.' });
    return json(res, 200, { report });
  });

  // Authenticated: create a new road problem report.
  app.post('/api/reports', (req, res) => {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    let user = null;
    if (authUserByToken && token) {
      user = authUserByToken(token);
    }
    if (!user) return json(res, 401, { error: 'Please sign in to report an issue.' });

    const { type, lat, lng, description, title } = req.body || {};
    if (!VALID_TYPES.includes(type)) {
      return json(res, 400, { error: 'A valid report type is required.' });
    }
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (
      Number.isNaN(latNum) || Number.isNaN(lngNum) ||
      latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180
    ) {
      return json(res, 400, { error: 'A valid location (lat/lng) is required.' });
    }

    const report = {
      id: 'r' + Date.now() + Math.floor(Math.random() * 1e4),
      type,
      title: String(title || REPORT_TYPES[type].label || type),
      description: String(description || ''),
      lat: latNum,
      lng: lngNum,
      status: 'open', // open | investigating | resolved
      reportedBy: user.name,
      userId: user.id,
      createdAt: new Date().toISOString(),
      votes: 0
    };
    const db = readDB();
    db.reports = db.reports || [];
    db.reports.unshift(report);
    writeDB(db);
    return json(res, 201, { report });
  });

  // Authenticated: update a report's status (e.g. mark resolved).
  app.patch('/api/reports/:id', (req, res) => {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const db = readDB();
    let user = null;
    if (authUserByToken && token) {
      user = authUserByToken(token);
    }
    if (!user) return json(res, 401, { error: 'Not authenticated.' });

    const report = (db.reports || []).find(r => r.id === req.params.id);
    if (!report) return json(res, 404, { error: 'Report not found.' });

    const allowedStatus = ['open', 'investigating', 'resolved'];
    const nextStatus = req.body && req.body.status;
    if (nextStatus && allowedStatus.includes(nextStatus)) {
      report.status = nextStatus;
    }
    if (req.body && req.body.vote === true) {
      report.votes = (report.votes || 0) + 1;
      report.votedBy = report.votedBy || [];
      if (!report.votedBy.includes(user.id)) report.votedBy.push(user.id);
    }
    writeDB(db);
    return json(res, 200, { report });
  });
};
