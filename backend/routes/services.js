// routes/services.js — Services REVEX (Stockage + Inventaire)
const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// ── CRÉER une demande de service ──────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      type, company_name, contact_name, phone, address, city, notes,
      scheduled_date,
      // Stockage
      stock_type, quantity_tons, duration_months, conditions, surface_m2,
      // Inventaire
      nb_references_est, site_access, nb_staff_needed, inventory_type
    } = req.body;

    if (!['storage','inventory'].includes(type))
      return res.status(400).json({ error: 'Type invalide (storage|inventory)' });

    const { rows } = await query(`
      INSERT INTO service_requests (
        user_id, type, company_name, contact_name, phone, address, city,
        notes, scheduled_date,
        stock_type, quantity_tons, duration_months, conditions, surface_m2,
        nb_references_est, site_access, nb_staff_needed, inventory_type
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [
        req.user.id, type,
        company_name || req.user.company_name,
        contact_name || req.user.contact_name,
        phone || null, address || null, city || req.user.city || null,
        notes || null, scheduled_date || null,
        stock_type || null, quantity_tons || null,
        duration_months || null, JSON.stringify(conditions || {}), surface_m2 || null,
        nb_references_est || null, site_access || null,
        nb_staff_needed || 2, inventory_type || null
      ]
    );

    // Notifier l'équipe REVEX (via notification admin)
    const admins = await query("SELECT id FROM users WHERE role='admin' LIMIT 3");
    const label  = type === 'storage' ? 'Stockage chez REVEX' : 'Inventaire physique';
    for (const admin of admins.rows) {
      query(`INSERT INTO notifications (user_id,type,title,body,data) VALUES ($1,'service_request',$2,$3,$4)`,
        [admin.id,
         '📋 Nouvelle demande — ' + label,
         (company_name || req.user.company_name) + ' demande un service ' + label,
         JSON.stringify({ service_id: rows[0].id, type })]
      ).catch(() => {});
    }

    // Notifier le demandeur
    query(`INSERT INTO notifications (user_id,type,title,body) VALUES ($1,'service_confirmed',$2,$3)`,
      [req.user.id,
       type === 'storage' ? '📦 Demande de stockage reçue !' : '🔍 Demande d\'inventaire reçue !',
       'Notre équipe vous contactera sous 24h pour confirmer les détails.']
    ).catch(() => {});

    res.status(201).json({
      message: type === 'storage'
        ? 'Demande de stockage enregistrée ! Notre équipe vous contacte sous 24h.'
        : 'Inventaire commandé ! Notre staff sera planifié selon votre date.',
      service: rows[0]
    });
  } catch(err) { next(err); }
});

// ── MES demandes ──────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM service_requests WHERE user_id=$1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ services: rows });
  } catch(err) { next(err); }
});

// ── ADMIN : toutes les demandes ───────────────────────────────
router.get('/admin', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error:'Admin requis' });
    const { rows } = await query(`
      SELECT sr.*, u.company_name, u.email, u.phone AS user_phone
      FROM service_requests sr
      JOIN users u ON sr.user_id = u.id
      ORDER BY sr.created_at DESC
    `);
    res.json({ services: rows });
  } catch(err) { next(err); }
});

// ── Mettre à jour le statut (admin) ──────────────────────────
router.put('/:id/status', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error:'Admin requis' });
    const { status } = req.body;
    const { rows } = await query(
      'UPDATE service_requests SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error:'Demande introuvable' });
    res.json({ service: rows[0] });
  } catch(err) { next(err); }
});

module.exports = router;
