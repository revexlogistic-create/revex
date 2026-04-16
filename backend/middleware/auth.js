// middleware/auth.js — Authentification JWT et gestion des rôles
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Vérifie le JWT et attache l'utilisateur à req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant ou format invalide' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Vérifier que l'utilisateur existe toujours et est actif
    const { rows } = await query(
      'SELECT id, email, role, status, company_name, contact_name, avatar_url, tokens_balance, city, region FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (!rows.length) return res.status(401).json({ error: 'Utilisateur introuvable' });
    if (rows[0].status === 'suspended') return res.status(403).json({ error: 'Compte suspendu' });
    if (rows[0].status === 'pending') return res.status(403).json({ error: 'Compte en attente de validation' });

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Token expiré', code: 'TOKEN_EXPIRED' });
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Token invalide' });
    next(err);
  }
};

/**
 * Optionnel : attache l'user si token présent, sinon continue
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return next();
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query('SELECT id, email, role, status FROM users WHERE id = $1', [decoded.userId]);
    if (rows.length && rows[0].status === 'active') req.user = rows[0];
  } catch {}
  next();
};

/**
 * Vérifie que l'utilisateur a un des rôles autorisés
 * Usage : authorize('admin'), authorize('admin', 'seller')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Accès refusé. Rôles requis : ${roles.join(', ')}` });
  }
  next();
};

/**
 * Vérifie que l'utilisateur est admin OU propriétaire de la ressource
 */
const authorizeOwnerOrAdmin = (getOwnerId) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  if (req.user.role === 'admin') return next();
  try {
    const ownerId = await getOwnerId(req);
    if (ownerId === req.user.id) return next();
    return res.status(403).json({ error: 'Accès interdit : vous n\'êtes pas propriétaire de cette ressource' });
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, optionalAuth, authorize, authorizeOwnerOrAdmin };
