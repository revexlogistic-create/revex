// controllers/adminController.js
const { query } = require('../config/db');

// ── DASHBOARD STATS ───────────────────────────────────────────
const getDashboardStats = async (req, res, next) => {
  try {
    const [users, products, orders, revenue, recentOrders, topProducts, salesByMonth] = await Promise.all([
      query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='active')  AS active,
        COUNT(*) FILTER (WHERE status='pending') AS pending,
        COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '30 days') AS new_this_month
        FROM users WHERE role != 'admin'`),

      query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='active') AS active,
        COUNT(*) FILTER (WHERE status='sold')   AS sold,
        COUNT(*) FILTER (WHERE status='draft')  AS draft,
        COALESCE(SUM(price*quantity) FILTER (WHERE status='active'),0) AS total_value
        FROM products`),

      query(`SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status='delivered') AS delivered,
        COUNT(*) FILTER (WHERE status='pending')   AS pending,
        COUNT(*) FILTER (WHERE created_at >= NOW()-INTERVAL '30 days') AS this_month
        FROM orders`),

      query(`SELECT
        COALESCE(SUM(final_price),0) AS total_revenue,
        COALESCE(SUM(final_price) FILTER (WHERE created_at >= NOW()-INTERVAL '30 days'),0) AS monthly_revenue
        FROM orders WHERE status='delivered'`),

      query(`SELECT o.*, p.title AS product_title,
        b.company_name AS buyer_company, s.company_name AS seller_company
        FROM orders o
        JOIN products p ON o.product_id=p.id
        JOIN users b ON o.buyer_id=b.id
        JOIN users s ON o.seller_id=s.id
        ORDER BY o.created_at DESC LIMIT 20`),

      query(`SELECT p.id, p.title, p.price, p.views_count, p.favorites_count, p.slug,
        u.company_name AS seller_company,
        COUNT(o.id) AS orders_count
        FROM products p
        LEFT JOIN orders o ON o.product_id=p.id
        LEFT JOIN users u ON p.seller_id=u.id
        WHERE p.status='active'
        GROUP BY p.id, u.company_name
        ORDER BY p.views_count DESC LIMIT 10`),

      query(`SELECT TO_CHAR(created_at,'YYYY-MM') AS month,
        COUNT(*) AS orders,
        COALESCE(SUM(final_price),0) AS revenue
        FROM orders WHERE created_at >= NOW()-INTERVAL '12 months'
        GROUP BY month ORDER BY month`)
    ]);

    res.json({
      stats: {
        users:    users.rows[0],
        products: products.rows[0],
        orders:   orders.rows[0],
        revenue:  revenue.rows[0]
      },
      recentOrders: recentOrders.rows,
      topProducts:  topProducts.rows,
      salesByMonth: salesByMonth.rows
    });
  } catch (err) { next(err); }
};

// ── TOUS LES UTILISATEURS (sans limite forcée) ─────────────────
const getUsers = async (req, res, next) => {
  try {
    const { page=1, limit=0, role, status, search } = req.query;
    const params = [];
    const conds  = [];

    if (role)   conds.push(`role   = $${params.push(role)}`);
    if (status) conds.push(`status = $${params.push(status)}`);
    if (search) {
      params.push(`%${search}%`);
      conds.push(`(company_name ILIKE $${params.length} OR email ILIKE $${params.length} OR contact_name ILIKE $${params.length})`);
    }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const limitClause = parseInt(limit) > 0
      ? `LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page)-1)*parseInt(limit)}`
      : '';

    const { rows } = await query(`
      SELECT id, email, role, status, company_name, contact_name,
             phone, city, region, sector, ice_number, rc_number, total_sales, total_purchases,
             rating, reviews_count, tokens_balance, created_at
      FROM users ${where}
      ORDER BY created_at DESC ${limitClause}
    `, params);

    const count = await query(`SELECT COUNT(*) FROM users ${where}`, params);
    res.json({ users: rows, total: parseInt(count.rows[0].count) });
  } catch (err) { next(err); }
};

// ── ACTIVER / SUSPENDRE UTILISATEUR ───────────────────────────
const updateUserStatus = async (req, res, next) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;
    if (!['active','suspended','pending'].includes(status))
      return res.status(400).json({ error: 'Statut invalide' });

    const { rows } = await query(
      `UPDATE users SET status=$1 WHERE id=$2 AND role!='admin' RETURNING id,email,status,company_name`,
      [status, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Utilisateur introuvable' });

    query(`INSERT INTO notifications (user_id,type,title,body) VALUES ($1,'account_status',$2,$3)`,
      [id,
       status==='active' ? '✅ Compte activé' : status==='suspended' ? '🔴 Compte suspendu' : 'Statut mis à jour',
       status==='active' ? 'Votre compte REVEX est maintenant actif.' : 'Votre compte a été suspendu. Contactez le support.'
      ]
    ).catch(()=>{});

    res.json({ message: `Utilisateur ${status}`, user: rows[0] });
  } catch (err) { next(err); }
};

// Action shortcuts (activate/suspend)
const activateUser = async (req, res, next) => {
  req.body = { status: 'active' };
  return updateUserStatus(req, res, next);
};
const suspendUser = async (req, res, next) => {
  req.body = { status: 'suspended' };
  return updateUserStatus(req, res, next);
};

// ── TOUS LES PRODUITS (sans limite forcée) ─────────────────────
const adminGetProducts = async (req, res, next) => {
  try {
    const { page=1, limit=0, status, search } = req.query;
    const params = [];
    const conds  = [];

    if (status && status !== 'all') conds.push(`p.status = $${params.push(status)}`);
    if (search) { params.push(`%${search}%`); conds.push(`p.title ILIKE $${params.length}`); }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const limitClause = parseInt(limit) > 0
      ? `LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page)-1)*parseInt(limit)}`
      : '';

    let rows;
    try {
      const r = await query(`
        SELECT p.id, p.title, p.slug, p.reference, p.price, p.condition, p.quantity,
               p.status, p.views_count, p.created_at, p.images, p.quality_grade,
               COALESCE(p.is_auto, false) AS is_auto,
               p.vehicle_make, p.vehicle_model, p.vehicle_year, p.urgent_mode,
               u.company_name AS seller_company, u.id AS seller_id,
               c.name AS category_name
        FROM products p
        LEFT JOIN users u ON p.seller_id=u.id
        LEFT JOIN categories c ON p.category_id=c.id
        ${where}
        ORDER BY p.created_at DESC ${limitClause}
      `, params);
      rows = r.rows;
    } catch (colErr) {
      if (colErr.code === '42703') {
        const r = await query(`
          SELECT p.id, p.title, p.slug, p.reference, p.price, p.condition, p.quantity,
                 p.status, p.views_count, p.created_at, p.images, p.quality_grade,
                 false AS is_auto, NULL AS vehicle_make, NULL AS vehicle_model,
                 NULL AS vehicle_year, false AS urgent_mode,
                 u.company_name AS seller_company, u.id AS seller_id,
                 c.name AS category_name
          FROM products p
          LEFT JOIN users u ON p.seller_id=u.id
          LEFT JOIN categories c ON p.category_id=c.id
          ${where}
          ORDER BY p.created_at DESC ${limitClause}
        `, params);
        rows = r.rows;
      } else { throw colErr; }
    }
    const count = await query(`SELECT COUNT(*) FROM products p ${where}`, params);
    res.json({ products: rows, total: parseInt(count.rows[0].count) });
  } catch (err) { next(err); }
};

// Approuver / retirer un produit
const approveProduct = async (req, res, next) => {
  try {
    const { rows } = await query(
      "UPDATE products SET status='active', published_at=NOW() WHERE id=$1 RETURNING id,title,status",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Produit introuvable' });
    res.json({ message: 'Produit approuvé', product: rows[0] });
  } catch (err) { next(err); }
};

const suspendProduct = async (req, res, next) => {
  try {
    const { rows } = await query(
      "UPDATE products SET status='archived' WHERE id=$1 RETURNING id,title,status",
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Produit introuvable' });
    res.json({ message: 'Produit retiré', product: rows[0] });
  } catch (err) { next(err); }
};

// ── TOUTES LES COMMANDES (admin) ──────────────────────────────
const adminGetOrders = async (req, res, next) => {
  try {
    const { page=1, limit=0, status } = req.query;
    const params = [];
    const cond   = status && status!=='all' ? `WHERE o.status = $${params.push(status)}` : '';
    const limitClause = parseInt(limit) > 0
      ? `LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page)-1)*parseInt(limit)}`
      : '';

    const { rows } = await query(`
      SELECT o.*,
        p.title AS product_title, p.slug AS product_slug,
        b.company_name AS buyer_company,
        s.company_name AS seller_company
      FROM orders o
      JOIN products p ON o.product_id=p.id
      JOIN users b ON o.buyer_id=b.id
      JOIN users s ON o.seller_id=s.id
      ${cond}
      ORDER BY o.created_at DESC ${limitClause}
    `, params);

    const count = await query(`SELECT COUNT(*) FROM orders o ${cond}`, params);
    res.json({ orders: rows, total: parseInt(count.rows[0].count) });
  } catch (err) { next(err); }
};


// ── METTRE À JOUR STATUT COMMANDE (admin) ─────────────────────
const adminUpdateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;
    const allowed = ['pending','confirmed','shipped','delivered','cancelled'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Statut invalide' });

    const { rows } = await query(
      'UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Commande introuvable' });

    // Si annulation, rembourser l'escrow
    if (status === 'cancelled') {
      await query(
        "UPDATE escrow_transactions SET status='refunded', refunded_at=NOW(), release_trigger='admin_cancel' WHERE order_id=$1",
        [id]
      ).catch(() => null);
    }
    // Si livraison confirmée, libérer l'escrow
    if (status === 'delivered') {
      await query(
        "UPDATE escrow_transactions SET status='released', released_at=NOW(), release_trigger='admin_confirm' WHERE order_id=$1",
        [id]
      ).catch(() => null);
    }

    res.json({ message: 'Statut mis à jour', order: rows[0] });
  } catch (err) { next(err); }
};

// ── LIBÉRER ESCROW MANUELLEMENT (admin) ───────────────────────
const adminReleaseEscrow = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision } = req.body; // 'seller' ou 'buyer'

    const order = await query('SELECT * FROM orders WHERE id=$1', [id]);
    if (!order.rows.length) return res.status(404).json({ error: 'Commande introuvable' });

    const escrowStatus = decision === 'seller' ? 'released' : 'refunded';
    const tsField      = decision === 'seller' ? 'released_at' : 'refunded_at';
    await query(
      'UPDATE escrow_transactions SET status=$1, '+tsField+"=NOW(), release_trigger='admin_forced' WHERE order_id=$2",
      [escrowStatus, id]
    );

    const newOrderStatus = decision === 'seller' ? 'delivered' : 'cancelled';
    await query('UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2', [newOrderStatus, id]);

    res.json({ message: 'Escrow ' + (decision === 'seller' ? 'libéré vers vendeur' : 'remboursé acheteur') });
  } catch (err) { next(err); }
};

// ── DÉTAIL COMMANDE (admin) ────────────────────────────────────
const adminGetOrderDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      SELECT o.*,
        p.title AS product_title, p.slug AS product_slug, p.images AS product_images,
        b.company_name AS buyer_company, b.email AS buyer_email, b.phone AS buyer_phone, b.city AS buyer_city,
        s.company_name AS seller_company, s.email AS seller_email, s.phone AS seller_phone, s.city AS seller_city,
        e.status AS escrow_status, e.amount AS escrow_amount
      FROM orders o
      JOIN products p ON o.product_id=p.id
      JOIN users b ON o.buyer_id=b.id
      JOIN users s ON o.seller_id=s.id
      LEFT JOIN escrow_transactions e ON e.order_id=o.id
      WHERE o.id=$1
    `, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Commande introuvable' });
    res.json({ order: rows[0] });
  } catch (err) { next(err); }
};

// ── TOUS LES LITIGES (admin) ───────────────────────────────────
const adminGetDisputes = async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    const cond   = status && status!=='all' ? `WHERE d.status = $${params.push(status)}` : '';

    const { rows } = await query(`
      SELECT d.*,
        o.order_number,
        b.company_name AS buyer_company,
        s.company_name AS seller_company,
        p.title AS product_title
      FROM disputes d
      JOIN orders o ON d.order_id=o.id
      JOIN users b ON d.buyer_id=b.id
      JOIN users s ON d.seller_id=s.id
      JOIN products p ON o.product_id=p.id
      ${cond}
      ORDER BY d.created_at DESC
    `, params).catch(() => ({ rows: [] }));

    res.json({ disputes: rows, total: rows.length });
  } catch (err) { next(err); }
};

module.exports = {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  activateUser,
  suspendUser,
  adminGetProducts,
  approveProduct,
  suspendProduct,
  adminGetOrders,
  adminUpdateOrderStatus,
  adminReleaseEscrow,
  adminGetOrderDetail,
  adminGetDisputes
};
