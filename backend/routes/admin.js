// routes/admin.js
const router  = require('express').Router();
const ctrl    = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/db');

const isAdmin = [authenticate, authorize('admin')];

// ── Dashboard ──────────────────────────────────────────────────
router.get('/dashboard',         ...isAdmin, ctrl.getDashboardStats);

// ── Utilisateurs ───────────────────────────────────────────────
router.get('/users',             ...isAdmin, ctrl.getUsers);
router.put('/users/:id/status',  ...isAdmin, ctrl.updateUserStatus);
router.put('/users/:id/activate',...isAdmin, ctrl.activateUser);
router.put('/users/:id/suspend', ...isAdmin, ctrl.suspendUser);

// ── Produits ───────────────────────────────────────────────────
router.get('/products',               ...isAdmin, ctrl.adminGetProducts);
router.put('/products/:id/approve',   ...isAdmin, ctrl.approveProduct);
router.put('/products/:id/suspend',   ...isAdmin, ctrl.suspendProduct);

// ── Commandes ──────────────────────────────────────────────────
router.get('/orders',              ...isAdmin, ctrl.adminGetOrders);
router.get('/orders/:id',          ...isAdmin, ctrl.adminGetOrderDetail);
router.put('/orders/:id/status',   ...isAdmin, ctrl.adminUpdateOrderStatus);
router.put('/orders/:id/escrow',   ...isAdmin, ctrl.adminReleaseEscrow);

// ── Litiges ────────────────────────────────────────────────────
router.get('/disputes',            ...isAdmin, ctrl.adminGetDisputes);

// ── LISTE des qualifications ───────────────────────────────────
router.get('/qualifications', ...isAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT sq.*, u.company_name, u.email, u.city, u.sector, u.phone, u.created_at AS user_created_at ' +
      'FROM seller_qualifications sq ' +
      'JOIN users u ON sq.seller_id = u.id ' +
      'ORDER BY CASE sq.status WHEN \'pending\' THEN 0 WHEN \'under_review\' THEN 1 ELSE 2 END, sq.submitted_at DESC'
    );
    res.json({ qualifications: rows, total: rows.length });
  } catch(err) { next(err); }
});

// ── Approuver/Rejeter qualification vendeur ────────────────────
router.put('/qualifications/:seller_id', ...isAdmin, async (req, res, next) => {
  try {
    const { status, review_notes } = req.body;
    if (!['approved','rejected'].includes(status))
      return res.status(400).json({ error: 'Statut invalide (approved|rejected)' });

    // Upsert qualification
    const existing = await query(
      'SELECT id FROM seller_qualifications WHERE seller_id = $1',
      [req.params.seller_id]
    );

    var qualifRows;
    if (existing.rows.length) {
      var r = await query(
        'UPDATE seller_qualifications SET status=$1, review_notes=$2, reviewed_by=$3, reviewed_at=NOW(), approved_at=$4 WHERE seller_id=$5 RETURNING *',
        [status, review_notes || null, req.user.id, status === 'approved' ? new Date() : null, req.params.seller_id]
      );
      qualifRows = r.rows;
    } else {
      var r2 = await query(
        'INSERT INTO seller_qualifications (seller_id, status, review_notes, reviewed_by, reviewed_at, approved_at) VALUES ($1,$2,$3,$4,NOW(),$5) RETURNING *',
        [req.params.seller_id, status, review_notes || null, req.user.id, status === 'approved' ? new Date() : null]
      );
      qualifRows = r2.rows;
    }

    // Update user status
    if (status === 'approved') {
      await query("UPDATE users SET status = 'qualified' WHERE id = $1", [req.params.seller_id]);
    }
    if (status === 'rejected') {
      await query("UPDATE users SET status = 'suspended' WHERE id = $1", [req.params.seller_id]);
    }

    // Notification
    query(
      'INSERT INTO notifications (user_id, type, title, body) VALUES ($1, $2, $3, $4)',
      [
        req.params.seller_id,
        'qualification_result',
        status === 'approved' ? 'Dossier approuve !' : 'Dossier refuse',
        status === 'approved'
          ? 'Votre dossier vendeur a ete approuve. Un administrateur va activer votre acces complet.'
          : 'Votre qualification a ete refusee. ' + (review_notes || '')
      ]
    ).catch(function() {});

    res.json({ qualification: qualifRows[0], message: status === 'approved' ? 'Vendeur qualifie' : 'Vendeur rejete' });
  } catch (err) { next(err); }
});

// ── Activer accès complet (après qualification) ────────────────
router.put('/users/:id/activate-full', ...isAdmin, async (req, res, next) => {
  try {
    var r = await query(
      "UPDATE users SET status = 'active' WHERE id = $1 RETURNING id, email, status",
      [req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Utilisateur introuvable' });

    query(
      'INSERT INTO notifications (user_id, type, title, body) VALUES ($1, $2, $3, $4)',
      [req.params.id, 'account_activated', 'Compte active !', 'Votre compte vendeur est maintenant actif. Vous pouvez publier vos stocks.']
    ).catch(function() {});

    res.json({ user: r.rows[0], message: 'Acces complet active' });
  } catch(err) { next(err); }
});

// ── Résoudre un litige ─────────────────────────────────────────
router.put('/disputes/:id/resolve', ...isAdmin, async (req, res, next) => {
  try {
    const { decision, resolution, admin_notes } = req.body;
    if (!['buyer','seller'].includes(decision))
      return res.status(400).json({ error: 'Decision invalide (buyer|seller)' });

    var disputes = await query('SELECT * FROM disputes WHERE id = $1', [req.params.id]);
    if (!disputes.rows.length) return res.status(404).json({ error: 'Litige introuvable' });
    var dispute = disputes.rows[0];

    var newStatus = decision === 'buyer' ? 'resolved_buyer' : 'resolved_seller';
    await query(
      'UPDATE disputes SET status=$1, resolution=$2, admin_notes=$3, resolved_by=$4, resolved_at=NOW() WHERE id=$5',
      [newStatus, resolution, admin_notes, req.user.id, req.params.id]
    );

    var notifUser = decision === 'buyer' ? dispute.buyer_id : dispute.seller_id;
    query(
      'INSERT INTO notifications (user_id, type, title, body) VALUES ($1, $2, $3, $4)',
      [notifUser, 'dispute_resolved', 'Litige resolu', 'Le litige a ete resolu en votre faveur. ' + (resolution || '')]
    ).catch(function() {});

    res.json({ message: 'Litige resolu en faveur du ' + (decision === 'buyer' ? 'acheteur' : 'vendeur') });
  } catch (err) { next(err); }
});

// ── Stats escrow ───────────────────────────────────────────────
router.get('/escrow-stats', ...isAdmin, async (req, res, next) => {
  try {
    var r = await query(
      'SELECT status, COUNT(*) AS count, COALESCE(SUM(amount),0) AS total FROM escrow_transactions GROUP BY status'
    );
    res.json({ stats: r.rows });
  } catch (err) { next(err); }
});

// ── Migration rapide ───────────────────────────────────────────
router.get('/migrate/products-auto', ...isAdmin, async (req, res) => {
  try {
    var results = [];
    var steps = [
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_auto BOOLEAN DEFAULT FALSE",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS vehicle_make VARCHAR(100)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR(100)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS vehicle_year INTEGER",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS urgent_mode BOOLEAN DEFAULT FALSE",
    ];
    for (var i = 0; i < steps.length; i++) {
      try {
        await query(steps[i]);
        results.push({ ok: true, sql: steps[i].substring(0, 60) });
      } catch(e) {
        results.push({ ok: false, sql: steps[i].substring(0, 60), error: e.message });
      }
    }
    res.json({ results, success: results.filter(function(r){ return !r.ok; }).length === 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
