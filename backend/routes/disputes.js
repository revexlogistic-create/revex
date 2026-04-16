// routes/disputes.js — Procédure de litige REVEX
const router  = require('express').Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// ── OUVRIR un litige (acheteur) ───────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { order_id, reason, description, evidence_urls=[] } = req.body;
    if (!order_id || !reason || !description)
      return res.status(400).json({ error:'order_id, reason et description requis' });

    const { rows: orders } = await query(
      "SELECT o.*, p.title AS product_title, o.seller_id FROM orders o JOIN products p ON o.product_id=p.id WHERE o.id=$1 AND o.buyer_id=$2",
      [order_id, req.user.id]
    );
    if (!orders.length) return res.status(404).json({ error:'Commande introuvable' });
    const order = orders[0];

    // Vérifier qu'il n'y a pas déjà un litige ouvert
    const { rows: existing } = await query(
      "SELECT id FROM disputes WHERE order_id=$1 AND status NOT IN ('resolved_buyer','resolved_seller','closed')",
      [order_id]
    );
    if (existing.length) return res.status(400).json({ error:'Un litige est déjà ouvert pour cette commande' });

    const { rows } = await query(`
      INSERT INTO disputes
        (order_id, buyer_id, seller_id, reason, description, evidence_urls, status, priority, opened_by)
      VALUES ($1,$2,$3,$4,$5,$6,'open','normal',$7)
      RETURNING *`,
      [order_id, req.user.id, order.seller_id, reason, description, JSON.stringify(evidence_urls), req.user.id]
    );

    // Marquer la commande — utiliser une colonne texte si l'enum est strict
    await query("UPDATE orders SET status='disputed'::order_status WHERE id=$1", [order_id]).catch(async () => {
      // Si 'disputed' n'est pas dans l'enum, on ajoute d'abord la valeur
      await query("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'disputed'").catch(()=>{});
      await query("UPDATE orders SET status='disputed' WHERE id=$1", [order_id]).catch(()=>{});
    });

    // Notifier le vendeur
    query(`INSERT INTO notifications (user_id,type,title,body,data) VALUES ($1,'dispute_opened','⚠️ Litige ouvert',$2,$3)`,
      [order.seller_id,
       req.user.company_name + ' a ouvert un litige sur la commande ' + order.order_number + ' : ' + reason,
       JSON.stringify({ dispute_id: rows[0].id, order_id })]
    ).catch(()=>{});

    // Notifier les admins
    const admins = await query("SELECT id FROM users WHERE role='admin' LIMIT 3");
    for (const a of admins.rows) {
      query(`INSERT INTO notifications (user_id,type,title,body,data) VALUES ($1,'new_dispute','🚨 Nouveau litige',$2,$3)`,
        [a.id, 'Litige sur ' + order.order_number + ' — ' + req.user.company_name + ' vs vendeur',
         JSON.stringify({ dispute_id: rows[0].id })]
      ).catch(()=>{});
    }

    res.status(201).json({ message:'Litige ouvert. Notre équipe vous contactera sous 24h.', dispute: rows[0] });
  } catch(err) { next(err); }
});

// ── RÉPONDRE au litige (vendeur) ──────────────────────────────
router.post('/:id/respond', authenticate, async (req, res, next) => {
  try {
    const { response, evidence_urls=[] } = req.body;
    if (!response) return res.status(400).json({ error:'Réponse obligatoire' });

    const { rows } = await query('SELECT * FROM disputes WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error:'Litige introuvable' });
    if (rows[0].seller_id !== req.user.id)
      return res.status(403).json({ error:'Réservé au vendeur' });

    await query(`
      UPDATE disputes SET
        seller_response=$1,
        seller_evidence_urls=$2,
        seller_responded_at=NOW(),
        status='under_review'
      WHERE id=$3`,
      [response, JSON.stringify(evidence_urls), req.params.id]
    );

    // Notifier l'acheteur
    query(`INSERT INTO notifications (user_id,type,title,body,data) VALUES ($1,'dispute_response','💬 Réponse du vendeur',$2,$3)`,
      [rows[0].buyer_id, 'Le vendeur a répondu à votre litige. En attente d\'arbitrage REVEX.',
       JSON.stringify({ dispute_id: req.params.id })]
    ).catch(()=>{});

    res.json({ message:'Réponse enregistrée. L\'arbitrage REVEX va traiter votre dossier.' });
  } catch(err) { next(err); }
});

// ── MES LITIGES (acheteur ou vendeur) ─────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT d.*,
        o.order_number, o.final_price,
        p.title AS product_title,
        buyer.company_name  AS buyer_company,
        seller.company_name AS seller_company,
        EXTRACT(EPOCH FROM (NOW() - d.created_at))/3600 AS hours_open
      FROM disputes d
      JOIN orders o ON d.order_id = o.id
      JOIN products p ON o.product_id = p.id
      JOIN users buyer  ON d.buyer_id  = buyer.id
      JOIN users seller ON d.seller_id = seller.id
      WHERE d.buyer_id=$1 OR d.seller_id=$1
      ORDER BY d.created_at DESC
    `, [req.user.id]);
    res.json({ disputes: rows });
  } catch(err) { next(err); }
});

// ── DÉTAIL d'un litige ─────────────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT d.*,
        o.order_number, o.final_price, o.status AS order_status,
        p.title AS product_title, p.images AS product_images,
        buyer.company_name  AS buyer_company,  buyer.email  AS buyer_email,
        seller.company_name AS seller_company, seller.email AS seller_email
      FROM disputes d
      JOIN orders o ON d.order_id = o.id
      JOIN products p ON o.product_id = p.id
      JOIN users buyer  ON d.buyer_id  = buyer.id
      JOIN users seller ON d.seller_id = seller.id
      WHERE d.id=$1 AND (d.buyer_id=$2 OR d.seller_id=$2 OR $3)
    `, [req.params.id, req.user.id, req.user.role==='admin']);

    if (!rows.length) return res.status(404).json({ error:'Litige introuvable' });
    res.json({ dispute: rows[0] });
  } catch(err) { next(err); }
});

module.exports = router;
