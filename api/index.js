const app = require('../src/index.js');

// Vercel serverless entrypoint. The Express app is exported from
// src/index.js; Vercel mounts this file at /api so every route the app
// defines (starting with /api/v1 and /api/data) resolves under it.
module.exports = app;
