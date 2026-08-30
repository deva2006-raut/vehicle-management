// UserAuthModule — real backend user system (signup / login / logout,
// profiles, saved locations, favorites, preferences, route history).
//
// Uses a dedicated users.json store so it never collides with the fleet
// data that the dashboard persists through /api/data. Passwords are hashed
// with Node's built-in crypto.scrypt (no plaintext, no extra deps).

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const USER_DB = path.join(__dirname, '../users.json');

function seedUsers() {
  if (!fs.existsSync(USER_DB)) {
    fs.writeFileSync(USER_DB, JSON.stringify({ users: [], sessions: [] }, null, 2));
  }
}

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(USER_DB, 'utf8'));
  } catch (e) {
    return { users: [], sessions: [] };
  }
}

function writeDB(db) {
  fs.writeFileSync(USER_DB, JSON.stringify(db, null, 2));
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function makeSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function makeToken() {
  return crypto.randomBytes(32).toString('hex');
}

function publicUser(u, token) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    preferences: u.preferences || {},
    savedLocations: u.savedLocations || [],
    history: u.history || [],
    token
  };
}

function findUserByToken(db, token) {
  if (!token) return null;
  const session = db.sessions.find(s => s.token === token);
  if (!session) return null;
  return db.users.find(u => u.id === session.userId) || null;
}

// Auth lookup that reads the user store internally (used by other modules,
// e.g. road reports, that don't share the users.json file handle).
function authUserByToken(token) {
  if (!token) return null;
  return findUserByToken(readDB(), token);
}

function defaultUserData() {
  return {
    preferences: {
      vehicleType: 'car',
      routeMode: 'fastest',
      avoidToll: false,
      avoidHighway: false,
      language: 'en',
      theme: 'dark'
    },
    savedLocations: [],
    history: []
  };
}

function json(res, code, body) {
  res.status(code).json(body);
}

module.exports = function mountUserApi(app) {
  seedUsers();

  // Sign up — create account + start a session.
  app.post('/api/auth/signup', (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return json(res, 400, { error: 'Name, email and password are required.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);
    if (cleanPassword.length < 6) {
      return json(res, 400, { error: 'Password must be at least 6 characters.' });
    }
    const db = readDB();
    if (db.users.some(u => u.email === cleanEmail)) {
      return json(res, 409, { error: 'An account with this email already exists.' });
    }
    const salt = makeSalt();
    const user = {
      id: 'u' + Date.now() + Math.floor(Math.random() * 1e4),
      name: String(name).trim(),
      email: cleanEmail,
      role: 'user',
      salt,
      passwordHash: hashPassword(cleanPassword, salt),
      createdAt: new Date().toISOString(),
      ...defaultUserData()
    };
    db.users.push(user);
    const session = { token: makeToken(), userId: user.id, createdAt: new Date().toISOString() };
    db.sessions.push(session);
    writeDB(db);
    return json(res, 201, { user: publicUser(user, session.token) });
  });

  // Log in — verify credentials + start a session.
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return json(res, 400, { error: 'Email and password are required.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const db = readDB();
    const user = db.users.find(u => u.email === cleanEmail);
    if (!user) {
      return json(res, 401, { error: 'Invalid email or password.' });
    }
    const attempt = hashPassword(String(password), user.salt);
    if (attempt !== user.passwordHash) {
      return json(res, 401, { error: 'Invalid email or password.' });
    }
    const session = { token: makeToken(), userId: user.id, createdAt: new Date().toISOString() };
    db.sessions.push(session);
    writeDB(db);
    return json(res, 200, { user: publicUser(user, session.token) });
  });

  // Restore session — validate a token.
  app.get('/api/auth/me', (req, res) => {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const db = readDB();
    const user = findUserByToken(db, token);
    if (!user) return json(res, 401, { error: 'Not authenticated.' });
    return json(res, 200, { user: publicUser(user, token) });
  });

  // Log out — destroy the session.
  app.post('/api/auth/logout', (req, res) => {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const db = readDB();
    db.sessions = db.sessions.filter(s => s.token !== token);
    writeDB(db);
    return json(res, 200, { success: true });
  });

  // ---- Authenticated data endpoints ----

  function requireAuth(handler) {
    return (req, res) => {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const db = readDB();
      const user = findUserByToken(db, token);
      if (!user) return json(res, 401, { error: 'Not authenticated.' });
      return handler(req, res, db, user, token);
    };
  }

  // Update profile details + preferences.
  app.put('/api/profile', requireAuth((req, res, db, user) => {
    const body = req.body || {};
    if (body.name) user.name = String(body.name).trim();
    if (body.preferences && typeof body.preferences === 'object') {
      user.preferences = { ...user.preferences, ...body.preferences };
    }
    writeDB(db);
    return json(res, 200, { user: publicUser(user) });
  }));

  // Add a saved location.
  app.post('/api/saved-locations', requireAuth((req, res, db, user) => {
    const { label, address, lat, lng, tag, favorite } = req.body || {};
    if (!label || !lat || !lng) {
      return json(res, 400, { error: 'label, lat and lng are required.' });
    }
    const loc = {
      id: 'loc' + Date.now() + Math.floor(Math.random() * 1e4),
      label: String(label),
      address: String(address || ''),
      lat: Number(lat),
      lng: Number(lng),
      tag: String(tag || 'custom'), // home | work | college | custom
      favorite: Boolean(favorite),
      createdAt: new Date().toISOString()
    };
    user.savedLocations = user.savedLocations || [];
    user.savedLocations.push(loc);
    writeDB(db);
    return json(res, 201, { location: loc });
  }));

  // Delete a saved location.
  app.delete('/api/saved-locations/:id', requireAuth((req, res, db, user) => {
    user.savedLocations = (user.savedLocations || []).filter(l => l.id !== req.params.id);
    writeDB(db);
    return json(res, 200, { success: true });
  }));

  // Toggle favorite on a saved location.
  app.patch('/api/saved-locations/:id/favorite', requireAuth((req, res, db, user) => {
    const loc = (user.savedLocations || []).find(l => l.id === req.params.id);
    if (!loc) return json(res, 404, { error: 'Location not found.' });
    loc.favorite = Boolean(req.body && req.body.favorite);
    writeDB(db);
    return json(res, 200, { location: loc });
  }));

  // Add a route to history.
  app.post('/api/history', requireAuth((req, res, db, user) => {
    const { from, to, distanceKm, durationMin } = req.body || {};
    if (!from || !to) {
      return json(res, 400, { error: 'from and to are required.' });
    }
    const entry = {
      id: 'h' + Date.now() + Math.floor(Math.random() * 1e4),
      from: String(from),
      to: String(to),
      distanceKm: Number(distanceKm || 0),
      durationMin: Number(durationMin || 0),
      createdAt: new Date().toISOString()
    };
    user.history = user.history || [];
    user.history.unshift(entry);
    user.history = user.history.slice(0, 50);
    writeDB(db);
    return json(res, 201, { history: entry });
  }));

  // Clear route history.
  app.delete('/api/history', requireAuth((req, res, db, user) => {
    user.history = [];
    writeDB(db);
    return json(res, 200, { success: true });
  }));
};

// Expose the token lookup so other modules (e.g. road reports) can
// authenticate against the same user/session store.
module.exports.findUserByToken = findUserByToken;
module.exports.authUserByToken = authUserByToken;
