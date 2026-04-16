// routes/admin.js
const router  = require('express').Router();
const ctrl    = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const { query } = require('../config/db');

const isAdmin = [authenticate, authorize('admin')];

// ── Dashboard ──────────────────────────────────────────────────
router.get('/dashboard',        ...isAdmin, ctrl.getDashboardStats);

// ── Utilisateurs ───────────────────────────────────────────────
router.get('/users',            ...isAdmin, ctrl.getUsers);
router.put('/users/:id/status', ...isAdmin, ctrl.updateUserStatus);
router.put('/users/:id/activate',...isAdmin, ctrl.activateUser);   // ← nouveau
router.put('/users/:id/suspend', ...isAdmin, ctrl.suspendUser);    // ← nouveau

// ── Produits ───────────────────────────────────────────────────
router.get('/products',               ...isAdmin, ctrl.adminGetProducts);
router.put('/products/:id/approve',   ...isAdmin, ctrl.approveProduct);  // ← nouveau
router.put('/products/:id/suspend',   ...isAdmin, ctrl.suspendProduct);  // ← nouveau

// ── Commandes ──────────────────────────────────────────────────
// ── GESTION COMMANDES ──────────────────────────────────────────
router.get('/orders',              ...isAdmin, ctrl.adminGetOrders);
router.get('/orders/:id',          ...isAdmin, ctrl.adminGetOrderDetail);
router.put('/orders/:id/status',   ...isAdmin, ctrl.adminUpdateOrderStatus);
router.put('/orders/:id/escrow',   ...isAdmin, ctrl.adminReleaseEscrow);

// ── Litiges ────────────────────────────────────────────────────
router.get('/disputes',         ...isAdmin, ctrl.adminGetDisputes); // ← nouveau

// ── Approuver/Rejeter qualification vendeur ────────────────────
router.put('/qualifications/:seller_id', ...isAdmin, async (req, res, next) => {
  try {
    const { status, review_notes } = req.body;
    if (!['approved','rejected'].includes(status))
      return res.status(400).json({ error: 'Statut invalide' });

    const { rows } = await query(
      `UPDATE seller_qualifications
       SET status=$1, review_notes=$2, reviewed_by=$3, approved_at=$4
       WHERE seller_id=$5 RETURNING *`,
      [status, review_notes||null, req.user.id,
       status==='approved' ? new Date() : null, req.params.seller_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Qualification introuvable' });

    if (status === 'approved') {
      await query("UPDATE users SET status='active' WHERE id=$1 AND role='seller'", [req.params.seller_id]);
    }

    query(`INSERT INTO notifications (user_id,type,title,body) VALUES ($1,'qualification_result',$2,$3)`,
      [req.params.seller_id,
       status==='approved' ? '✅ Qualification approuvée !' : '❌ Qualification refusée',
       status==='approved' ? 'Votre dossier vendeur a été approuvé. Vous pouvez publier vos stocks.'
                           : `Votre qualification a été refusée : ${review_notes}`]
    ).catch(()=>{});

    res.json({ qualification: rows[0] });
  } catch (err) { next(err); }
});

// ── Résoudre un litige ─────────────────────────────────────────
router.put('/disputes/:id/resolve', ...isAdmin, async (req, res, next) => {
  try {
    const { decision, resolution, admin_notes } = req.body;
    if (!['buyer','seller'].includes(decision))
      return res.status(400).json({ error: 'Décision invalide (buyer|seller)' });

    const { rows: disputes } = await query('SELECT * FROM disputes WHERE id=$1', [req.params.id]);
    if (!disputes.length) return res.status(404).json({ error: 'Litige introuvable' });
    const dispute = disputes[0];

    const newStatus = decision === 'buyer' ? 'resolved_buyer' : 'resolved_seller';
    await query(
      'UPDATE disputes SET status=$1,resolution=$2,admin_notes=$3,resolved_by=$4,resolved_at=NOW() WHERE id=$5',
      [newStatus, resolution, admin_notes, req.user.id, req.params.id]
    );

    const { rows: escrows } = await query(
      "SELECT id FROM escrow_transactions WHERE order_id=$1 AND status='disputed'",
      [dispute.order_id]
    ).catch(() => ({ rows: [] }));

    if (escrows.length) {
      const escrowStatus = decision==='buyer' ? 'refunded' : 'released';
      const tsField      = decision==='buyer' ? 'refunded_at' : 'released_at';
      await query(
        `UPDATE escrow_transactions SET status=$1,${tsField}=NOW(),release_trigger='admin_forced' WHERE id=$2`,
        [escrowStatus, escrows[0].id]
      );
    }

    const notifUser = decision==='buyer' ? dispute.buyer_id : dispute.seller_id;
    query(`INSERT INTO notifications (user_id,type,title,body) VALUES ($1,'dispute_resolved',$2,$3)`,
      [notifUser, '⚖️ Litige résolu', `Le litige a été résolu en votre faveur. ${resolution||''}`]
    ).catch(()=>{});

    res.json({ message: `Litige résolu en faveur du ${decision==='buyer'?'acheteur':'vendeur'}` });
  } catch (err) { next(err); }
});

// ── Stats escrow ───────────────────────────────────────────────
router.get('/escrow-stats', ...isAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT status,COUNT(*) AS count,COALESCE(SUM(amount),0) AS total FROM escrow_transactions GROUP BY status'
    );
    res.json({ stats: rows });
  } catch (err) { next(err); }
});


// ── MIGRATION RAPIDE via API (évite problème connexion migrate.js) ──
router.get('/migrate/products-auto', ...isAdmin, async (req, res) => {
  try {
    const { query } = require('../config/db');
    const results = [];

    const steps = [
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS is_auto BOOLEAN DEFAULT FALSE",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS vehicle_make VARCHAR(100)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR(100)",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS vehicle_year INTEGER",
      "CREATE INDEX IF NOT EXISTS idx_products_is_auto ON products(is_auto) WHERE is_auto = TRUE",
      "ALTER TABLE products ADD COLUMN IF NOT EXISTS urgent_mode BOOLEAN DEFAULT FALSE",
      "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check",
      "ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin','seller','buyer','distributor','transporter','acheteur_auto'))",
    ];

    for (const sql of steps) {
      try {
        await query(sql);
        results.push({ ok: true, sql: sql.substring(0, 60) });
      } catch (e) {
        results.push({ ok: false, sql: sql.substring(0, 60), error: e.message });
      }
    }

    const failed = results.filter(r => !r.ok);
    res.json({
      message: failed.length === 0 ? 'Migration reussie !' : 'Migration partielle',
      results,
      success: failed.length === 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// ── LISTE des qualifications en attente ──────────────────────
router.get('/qualifications', ...isAdmin, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT sq.*,
        u.company_name, u.email, u.city, u.sector, u.phone,
        u.created_at AS user_created_at
      FROM seller_qualifications sq
      JOIN users u ON sq.seller_id = u.id
      ORDER BY
        CASE sq.status WHEN 'pending' THEN 0 WHEN 'under_review' THEN 1 ELSE 2 END,
        sq.submitted_at DESC
    `);
    res.json({ qualifications: rows, total: rows.length });
  } catch(err) { next(err); }
});
