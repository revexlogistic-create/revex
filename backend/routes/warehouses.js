// backend/routes/warehouses.js — Gestion entrepôts REVEX
const express  = require('express');
const router   = express.Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const isAdmin = [authenticate, authorize('admin')];

// ── GET tous les entrepôts ────────────────────────────────────
// Public (lecture seule pour affichage côté vendeur si besoin)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM warehouses ORDER BY status, name',
      []
    );
    res.json({ warehouses: rows });
  } catch (err) { next(err); }
});

// ── GET un entrepôt par ID ────────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM warehouses WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Entrepôt introuvable' });
    res.json({ warehouse: rows[0] });
  } catch (err) { next(err); }
});

// ── POST créer un entrepôt ────────────────────────────────────
router.post('/', ...isAdmin, async (req, res, next) => {
  try {
    const {
      name, city, address, capacity, used, surface,
      status, type, responsable, phone, ouverture, notes
    } = req.body;

    if (!name || !city || !capacity) {
      return res.status(400).json({ error: 'Nom, ville et capacité obligatoires' });
    }

    // Générer un ID automatique
    const { rows: existing } = await query('SELECT id FROM warehouses ORDER BY id', []);
    const nums = existing
      .map(r => parseInt(r.id.replace('WH-', '')))
      .filter(n => !isNaN(n));
    const nextNum = nums.length ? Math.max(...nums) + 1 : 1;
    const newId = 'WH-' + String(nextNum).padStart(2, '0');

    const { rows } = await query(`
      INSERT INTO warehouses
        (id, name, city, address, capacity, used, surface, status, type, responsable, phone, ouverture, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        newId, name, city, address || null,
        Number(capacity), Number(used || 0), Number(surface || 0),
        status || 'actif', type || 'Industriel',
        responsable || null, phone || null,
        ouverture || 'Lun-Sam 8h-17h', notes || null
      ]
    );

    res.status(201).json({ warehouse: rows[0], message: 'Entrepôt ' + name + ' créé.' });
  } catch (err) { next(err); }
});

// ── PUT modifier un entrepôt ──────────────────────────────────
router.put('/:id', ...isAdmin, async (req, res, next) => {
  try {
    const {
      name, city, address, capacity, used, surface,
      status, type, responsable, phone, ouverture, notes
    } = req.body;

    const { rows } = await query(`
      UPDATE warehouses SET
        name        = COALESCE($1, name),
        city        = COALESCE($2, city),
        address     = COALESCE($3, address),
        capacity    = COALESCE($4, capacity),
        used        = COALESCE($5, used),
        surface     = COALESCE($6, surface),
        status      = COALESCE($7, status),
        type        = COALESCE($8, type),
        responsable = COALESCE($9, responsable),
        phone       = COALESCE($10, phone),
        ouverture   = COALESCE($11, ouverture),
        notes       = COALESCE($12, notes)
      WHERE id = $13
      RETURNING *`,
      [name, city, address, capacity ? Number(capacity) : null,
       used !== undefined ? Number(used) : null,
       surface ? Number(surface) : null,
       status, type, responsable, phone, ouverture, notes,
       req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Entrepôt introuvable' });
    res.json({ warehouse: rows[0], message: 'Entrepôt mis à jour.' });
  } catch (err) { next(err); }
});

// ── PATCH mettre à jour le volume occupé ─────────────────────
router.patch('/:id/volume', ...isAdmin, async (req, res, next) => {
  try {
    const { used, delta } = req.body;

    let newUsed;
    if (delta !== undefined) {
      // Ajout/soustraction relative (pour synchro stockage)
      const { rows: cur } = await query('SELECT used, capacity FROM warehouses WHERE id=$1', [req.params.id]);
      if (!cur.length) return res.status(404).json({ error: 'Entrepôt introuvable' });
      newUsed = Math.max(0, Math.min(cur[0].capacity, Number(cur[0].used) + Number(delta)));
    } else {
      newUsed = Number(used);
    }

    const { rows } = await query(
      'UPDATE warehouses SET used = $1 WHERE id = $2 RETURNING *',
      [newUsed, req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Entrepôt introuvable' });
    res.json({
      warehouse: rows[0],
      message: 'Volume mis à jour : ' + newUsed + ' m³'
    });
  } catch (err) { next(err); }
});

// ── PATCH changer le statut ───────────────────────────────────
router.patch('/:id/status', ...isAdmin, async (req, res, next) => {
  try {
    const { status } = req.body;
    const VALID = ['actif','inactif','maintenance','ouverture prévue'];
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Statut invalide' });

    const { rows } = await query(
      'UPDATE warehouses SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Entrepôt introuvable' });
    res.json({ warehouse: rows[0], message: 'Statut → ' + status });
  } catch (err) { next(err); }
});

// ── DELETE supprimer un entrepôt ──────────────────────────────
router.delete('/:id', ...isAdmin, async (req, res, next) => {
  try {
    // Vérifier qu'aucune demande active n'y est liée
    const { rows: linked } = await query(
      "SELECT COUNT(*) FROM storage_requests WHERE warehouse_id=$1 AND status IN ('confirmed','active')",
      [req.params.id]
    );
    if (Number(linked[0].count) > 0) {
      return res.status(400).json({
        error: 'Impossible de supprimer : ' + linked[0].count + ' demande(s) active(s) liée(s) à cet entrepôt.'
      });
    }

    const { rowCount } = await query('DELETE FROM warehouses WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Entrepôt introuvable' });
    res.json({ message: 'Entrepôt supprimé.' });
  } catch (err) { next(err); }
});


// ── GET vérifier si un produit est stocké chez REVEX ─────────
// Utilisé par ProductDetail pour afficher le badge entrepôt
router.get('/check-product/:productId', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT wa.*,
        w.id AS warehouse_id, w.name AS warehouse_name, w.city AS warehouse_city,
        w.address AS warehouse_address, w.responsable, w.phone AS warehouse_phone,
        w.ouverture, w.status AS warehouse_status
      FROM warehouse_articles wa
      JOIN warehouses w ON w.id = wa.warehouse_id
      WHERE wa.product_id = $1
        AND wa.status = 'en_stock'
        AND w.status = 'actif'
      ORDER BY wa.entree_date DESC
      LIMIT 1`,
      [req.params.productId]
    );

    if (!rows.length) return res.json({ warehouse: null, article: null });

    const row = rows[0];
    res.json({
      warehouse: {
        id: row.warehouse_id,
        name: row.warehouse_name,
        city: row.warehouse_city,
        address: row.warehouse_address,
        responsable: row.responsable,
        phone: row.warehouse_phone,
        ouverture: row.ouverture,
        status: row.warehouse_status,
      },
      article: {
        id: row.id,
        status: row.status,
        zone: row.zone,
        shelf: row.shelf,
        position: row.position,
        quantity: row.quantity,
        entree_date: row.entree_date,
      }
    });
  } catch (err) { next(err); }
});

module.exports = router;
