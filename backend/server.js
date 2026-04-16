require('dotenv').config()
// ============================================================
// REVEX MARKETPLACE — server.js
// ============================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middlewares globaux ──────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS — autorise localhost ET tout le réseau local (192.168.x.x)
app.use(cors({
  origin: function(origin, callback) {
    // Autoriser les requêtes sans origin (mobile apps, curl)
    if (!origin) return callback(null, true);
    // Autoriser localhost (toutes ports)
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) return callback(null, true);
    // Autoriser le réseau local 192.168.x.x
    if (origin.match(/^https?:\/\/192\.168\./)) return callback(null, true);
    // Autoriser le réseau local 10.x.x.x
    if (origin.match(/^https?:\/\/10\./)) return callback(null, true);
    // Autoriser l'URL frontend configurée
    if (origin === process.env.FRONTEND_URL) return callback(null, true);
    callback(null, true); // En dev, tout autoriser
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Fichiers statiques (uploads) ────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate limiting ────────────────────────────────────────────
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Trop de tentatives de connexion.' } });
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/products',   require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/orders',     require('./routes/orders'));
app.use('/api/quotes',     require('./routes/quotes'));
app.use('/api/messages',   require('./routes/messages'));
app.use('/api/transport',  require('./routes/transport'));
app.use('/api/analysis',   require('./routes/analysis'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/upload',     require('./routes/upload'));
app.use('/api/tokens',     require('./routes/tokens'));
app.use('/api/lots',       require('./routes/lots'));
app.use('/api/services',   require('./routes/services'));
app.use('/api/disputes',   require('./routes/disputes'));
app.use('/api/storage',    require('./routes/storage'));
app.use('/api/warehouses',  require('./routes/warehouses'));
app.use('/api/warehouses/:warehouseId/articles', require('./routes/warehouseArticles'));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', version: '1.0.0', env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
});

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable', path: req.path });
});

// ── Error handler global ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack || err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: process.env.NODE_ENV === 'production' ? 'Erreur interne du serveur' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// ── Démarrage sur 0.0.0.0 (accessible réseau local) ─────────
app.listen(PORT, '0.0.0.0', () => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  let localIP = 'localhost';
  Object.values(interfaces).forEach(function(iface) {
    iface.forEach(function(alias) {
      if (alias.family === 'IPv4' && !alias.internal) localIP = alias.address;
    });
  });
  console.log('\n🚀 REVEX API démarrée');
  console.log('📦 Environnement : ' + (process.env.NODE_ENV || 'development'));
  console.log('💻 PC     : http://localhost:' + PORT);
  console.log('📱 Réseau : http://' + localIP + ':' + PORT);
  console.log('📊 Health : http://localhost:' + PORT + '/api/health\n');
  console.log('👉 Sur ton téléphone, utilise : http://' + localIP + ':5000\n');
});

module.exports = app;
