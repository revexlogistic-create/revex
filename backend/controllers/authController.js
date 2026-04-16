// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'revex_super_secret_key_32chars_2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'revex_refresh_secret_key_32chars_2026';

// ── Helpers ──────────────────────────────────────────────────
const generateTokens = (userId, role) => {
  const access  = jwt.sign({ userId, role }, JWT_SECRET,         { expiresIn: '7d'  });
  const refresh = jwt.sign({ userId },       JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { access, refresh };
};

const safeUser = (user) => {
  const { password_hash, refresh_token, reset_token, email_verify_token, ...safe } = user;
  return safe;
};

// ── REGISTER ─────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const { email, password, role, company_name, contact_name, phone, city, region, sector, ice_number } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length) return res.status(409).json({ error: 'Cet email est déjà utilisé' });

    const allowedRoles = ['buyer', 'seller', 'distributor', 'acheteur_auto'];
    const userRole = allowedRoles.includes(role) ? role : 'buyer';

    const hash = await bcrypt.hash(password, 12);
    const verifyToken = uuidv4();

    const { rows } = await query(`
      INSERT INTO users (email, password_hash, role, status, company_name, contact_name, phone, city, region, sector, ice_number, email_verify_token)
      VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [email.toLowerCase(), hash, userRole, company_name, contact_name, phone || null, city || null, region || null, sector || null, ice_number || null, verifyToken]
    );

    const user = rows[0];
    const tokens = generateTokens(user.id, user.role);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refresh, user.id]);

    const WELCOME_TOKENS = 50;
    await query('UPDATE users SET tokens_balance = $1 WHERE id = $2', [WELCOME_TOKENS, user.id]);
    await query(`
      INSERT INTO token_transactions (user_id, type, operation, amount, balance_after, description)
      VALUES ($1, 'credit', 'welcome_bonus', $2, $2, 'Bonus de bienvenue REVEX')`,
      [user.id, WELCOME_TOKENS]
    ).catch(() => {});

    res.status(201).json({
      message: 'Compte créé avec succès. En attente de validation admin.',
      user: safeUser(user),
      tokens: { access: tokens.access, refresh: tokens.refresh }
    });
  } catch (err) { next(err); }
};

// ── LOGIN ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!rows.length) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

    if (user.status === 'suspended') return res.status(403).json({ error: 'Compte suspendu. Contactez l\'administration.' });
    if (user.status === 'pending')   return res.status(403).json({ error: 'Votre compte est en cours de validation.', code: 'PENDING' });

    const tokens = generateTokens(user.id, user.role);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refresh, user.id]);

    res.json({
      message: 'Connexion réussie',
      user: safeUser(user),
      tokens: { access: tokens.access, refresh: tokens.refresh }
    });
  } catch (err) { next(err); }
};

// ── REFRESH TOKEN ─────────────────────────────────────────────
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token manquant' });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const { rows } = await query('SELECT * FROM users WHERE id = $1 AND refresh_token = $2', [decoded.userId, refreshToken]);
    if (!rows.length) return res.status(401).json({ error: 'Refresh token invalide ou révoqué' });

    const user = rows[0];
    const tokens = generateTokens(user.id, user.role);
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [tokens.refresh, user.id]);

    res.json({ tokens: { access: tokens.access, refresh: tokens.refresh } });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Refresh token expiré, reconnectez-vous' });
    next(err);
  }
};

// ── LOGOUT ────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [req.user.id]);
    res.json({ message: 'Déconnecté avec succès' });
  } catch (err) { next(err); }
};

// ── ME ────────────────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    res.json({ user: safeUser(rows[0]) });
  } catch (err) { next(err); }
};

// ── CHANGE PASSWORD ───────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(400).json({ error: 'Mot de passe actuel incorrect' });

    const hash = await bcrypt.hash(newPassword, 12);
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id]);
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) { next(err); }
};

// ── FORGOT PASSWORD ───────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { rows } = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    res.json({ message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' });
  } catch (err) { next(err); }
};

module.exports = { register, login, refresh, logout, me, changePassword, forgotPassword };
