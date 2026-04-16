// backend/routes/storage.js — Gestion stockage REVEX
const express    = require('express');
const router     = express.Router();
const { query }  = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const isAdmin = [authenticate, authorize('admin')];

// ── Créer une demande de stockage (vendeur) ──────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      contactName, companyName, contactPhone, contactEmail, city,
      storageType, startDate,
      selectedProductIds, customItems, estimatedVol, estimatedQty,
      wantPhotos, wantCertif, wantInventory, wantPicking,
      deliveryMode, deliveryDate, deliveryNotes,
    } = req.body;

    // Fallbacks si données incomplètes (ex: demande automatique depuis analyse)
    const resolvedName  = contactName  || req.user.email || 'Contact';
    const resolvedPhone = contactPhone || req.user.phone || '+212 600 000 000';
    const resolvedCity  = city         || req.user.city  || 'Maroc';

    if (!resolvedName || !resolvedCity) {
      return res.status(400).json({ error: 'Nom et ville sont obligatoires' });
    }

    // Calcul estimation revenu
    const vol  = Number(estimatedVol) || (Array.isArray(selectedProductIds) ? selectedProductIds.length * 0.1 : 0.5);
    const base = Math.max(1, vol) * 15;
    const opts = (wantPhotos?150:0) + (wantCertif?100:0) + (wantInventory?200:0) + (wantPicking?50:0);
    const estimatedRevenue = Math.round(base + opts);

    const { rows } = await query(`
      INSERT INTO storage_requests (
        seller_id, contact_name, company_name, contact_phone, contact_email, city,
        storage_type, start_date,
        selected_product_ids, custom_items, estimated_vol, estimated_qty,
        want_photos, want_certif, want_inventory, want_picking,
        delivery_mode, delivery_date, delivery_notes,
        estimated_revenue
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,
        $9,$10,$11,$12,
        $13,$14,$15,$16,
        $17,$18,$19,
        $20
      ) RETURNING *`,
      [
        req.user.id, resolvedName, companyName || req.user.company_name, resolvedPhone, contactEmail, resolvedCity,
        storageType || 'long', startDate || null,
        JSON.stringify(selectedProductIds || []), customItems || null, estimatedVol || null, estimatedQty || null,
        wantPhotos !== false, wantCertif !== false, wantInventory !== false, !!wantPicking,
        deliveryMode || 'self', deliveryDate || null, deliveryNotes || null,
        estimatedRevenue,
      ]
    );

    // Notification admin (optionnel - pas de blocker si table absente)
    try {
      await query(`
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT id, 'storage_request', 'Nouvelle demande de stockage',
          $1 || ' a soumis une demande de stockage (' || $2 || ' m³)',
          $3
        FROM users WHERE role = 'admin' LIMIT 5`,
        [
          companyName || req.user.company_name,
          estimatedVol || '?',
          JSON.stringify({ requestId: rows[0].id }),
        ]
      );
    } catch (_) { /* notifications optionnelles */ }

    res.status(201).json({ request: rows[0], message: 'Demande de stockage créée avec succès' });
  } catch (err) {
    console.error('[storage POST] Error:', err.message, '| Code:', err.code);
    if (err.code === '42P01') {
      return res.status(500).json({ error: 'Table storage_requests inexistante. Lancez: node migrate.js' });
    }
    next(err);
  }
});

// ── Mes demandes (vendeur) ────────────────────────────────────
router.get('/my', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT sr.*,
        u.company_name AS seller_company, u.city AS seller_city
      FROM storage_requests sr
      JOIN users u ON u.id = sr.seller_id
      WHERE sr.seller_id = $1
      ORDER BY sr.created_at DESC`,
      [req.user.id]
    );
    res.json({ requests: rows });
  } catch (err) { next(err); }
});

// ── Détail d'une demande (vendeur ou admin) ───────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT sr.*,
        u.company_name AS seller_company, u.email AS seller_email,
        u.city AS seller_city, u.phone AS seller_phone
      FROM storage_requests sr
      JOIN users u ON u.id = sr.seller_id
      WHERE sr.id = $1
      AND (sr.seller_id = $2 OR $3 = 'admin')`,
      [req.params.id, req.user.id, req.user.role]
    );
    if (!rows.length) return res.status(404).json({ error: 'Demande introuvable' });
    res.json({ request: rows[0] });
  } catch (err) { next(err); }
});

// ── Toutes les demandes (admin) ───────────────────────────────
router.get('/', ...isAdmin, async (req, res, next) => {
  try {
    const { status, search } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (status) {
      params.push(status);
      whereClause += ' AND sr.status = $' + params.length;
    }
    if (search) {
      params.push('%' + search.toLowerCase() + '%');
      whereClause += ' AND (LOWER(sr.company_name) LIKE $' + params.length +
        ' OR LOWER(sr.city) LIKE $' + params.length +
        ' OR LOWER(sr.contact_name) LIKE $' + params.length + ')';
    }

    const { rows } = await query(`
      SELECT sr.*,
        u.company_name AS seller_company, u.email AS seller_email,
        u.city AS seller_city, u.phone AS seller_phone
      FROM storage_requests sr
      JOIN users u ON u.id = sr.seller_id
      ${whereClause}
      ORDER BY
        CASE sr.status WHEN 'pending' THEN 1 WHEN 'confirmed' THEN 2 WHEN 'active' THEN 3 ELSE 4 END,
        sr.created_at DESC`,
      params
    );
    res.json({ requests: rows });
  } catch (err) { next(err); }
});

// ── Mettre à jour le statut (admin) ──────────────────────────
router.put('/:id/status', ...isAdmin, async (req, res, next) => {
  try {
    const { status, adminNotes, warehouseId } = req.body;
    const VALID = ['pending','confirmed','active','completed','rejected'];
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Statut invalide' });

    const tsField = {
      confirmed: ', confirmed_at = NOW()',
      active:    ', activated_at = NOW()',
      completed: ', completed_at = NOW()',
    }[status] || '';

    const { rows } = await query(`
      UPDATE storage_requests
      SET status = $1
        ${adminNotes !== undefined ? ', admin_notes = $3' : ''}
        ${warehouseId ? ', warehouse_id = $4' : ''}
        ${tsField}
      WHERE id = $2
      RETURNING *`,
      [status, req.params.id, adminNotes, warehouseId].filter(v => v !== undefined)
    );

    if (!rows.length) return res.status(404).json({ error: 'Demande introuvable' });

    // Notification au vendeur
    const statusMessages = {
      confirmed: 'Votre demande de stockage a été confirmée ! Notre équipe prend contact avec vous.',
      active:    'Votre stock a été réceptionné dans notre entrepôt REVEX. Il est maintenant actif.',
      completed: 'Votre stock a été sorti de l\'entrepôt REVEX. La prestation est terminée.',
      rejected:  'Votre demande de stockage a été refusée. ' + (adminNotes || ''),
    };

    if (statusMessages[status]) {
      try {
        await query(`
          INSERT INTO notifications (user_id, type, title, message, data)
          VALUES ($1, 'storage_update', 'Mise à jour stockage REVEX', $2, $3)`,
          [rows[0].seller_id, statusMessages[status], JSON.stringify({ requestId: rows[0].id, status })]
        );
      } catch (_) { /* notifications optionnelles */ }
    }

    res.json({ request: rows[0], message: 'Statut mis à jour : ' + status });
  } catch (err) { next(err); }
});

// ── Générer bon de dépôt (admin) ─────────────────────────────
router.post('/:id/bon-depot', ...isAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT sr.*, u.company_name AS seller_company, u.email AS seller_email
      FROM storage_requests sr
      JOIN users u ON u.id = sr.seller_id
      WHERE sr.id = $1`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Demande introuvable' });

    const req2 = rows[0];
    const bonNum = 'REVEX-BD-' + req2.id.substring(0,8).toUpperCase();
    const now = new Date().toLocaleDateString('fr-MA', { day:'2-digit', month:'long', year:'numeric' });

    res.json({
      bonNumber: bonNum,
      date: now,
      request: req2,
      message: 'Bon de dépôt généré : ' + bonNum,
    });
  } catch (err) { next(err); }
});

// ── Émettre facture mensuelle (admin) ─────────────────────────
router.post('/:id/facture', ...isAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT sr.*, u.company_name AS seller_company
      FROM storage_requests sr
      JOIN users u ON u.id = sr.seller_id
      WHERE sr.id = $1 AND sr.status = 'active'`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Demande active introuvable' });

    const factNum = 'REVEX-FAC-' + rows[0].id.substring(0,8).toUpperCase() + '-' + new Date().getMonth();
    res.json({
      factureNumber: factNum,
      amount: rows[0].estimated_revenue,
      request: rows[0],
      message: 'Facture ' + factNum + ' émise',
    });
  } catch (err) { next(err); }
});

module.exports = router;
