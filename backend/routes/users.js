// routes/users.js
const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// ── RECHERCHE UTILISATEURS (pour la messagerie) ───────────────
// Accessible à tous les utilisateurs connectés
router.get('/search', authenticate, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ users: [] });

    const { rows } = await query(`
      SELECT id, company_name, contact_name, email, role, city, sector, avatar_url, rating
      FROM users
      WHERE status = 'active'
        AND role != 'admin'
        AND id != $1
        AND (
          company_name ILIKE $2
          OR email ILIKE $2
          OR contact_name ILIKE $2
        )
      ORDER BY company_name ASC
      LIMIT 10
    `, [req.user.id, `%${q}%`]);

    res.json({ users: rows });
  } catch (err) { next(err); }
});
router.get('/:id/profile', async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT u.id, u.company_name, u.contact_name, u.city, u.region, u.sector, u.avatar_url,
        u.rating, u.reviews_count, u.total_sales, u.created_at,
        sq.status AS qualification_status,
        COUNT(p.id) FILTER (WHERE p.status = 'active') AS active_products
      FROM users u
      LEFT JOIN seller_qualifications sq ON sq.seller_id = u.id
      LEFT JOIN products p ON p.seller_id = u.id
      WHERE u.id = $1 AND u.role != 'admin'
      GROUP BY u.id, sq.status`, [req.params.id]);

    if (!rows.length) return res.status(404).json({ error: 'Utilisateur introuvable' });

    const { rows: reviews } = await query(`
      SELECT r.rating, r.title, r.comment, r.created_at, u.company_name AS reviewer_company
      FROM reviews r JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewed_id = $1 AND r.is_verified = true
      ORDER BY r.created_at DESC LIMIT 10`, [req.params.id]);

    res.json({ profile: rows[0], reviews });
  } catch (err) { next(err); }
});

// Mettre à jour mon profil
router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { company_name, contact_name, phone, city, region, address, sector } = req.body;
    const { rows } = await query(
      'UPDATE users SET company_name=$1, contact_name=$2, phone=$3, city=$4, region=$5, address=$6, sector=$7 WHERE id=$8 RETURNING id,email,company_name,contact_name,phone,city,region,sector,avatar_url,role,status',
      [company_name, contact_name, phone || null, city || null, region || null, address || null, sector || null, req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
});

// Mes favoris
router.get('/me/favorites', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT p.id, p.title, p.slug, p.price, p.condition, p.images, p.location_city, p.trust_score, p.quality_grade,
        u.company_name AS seller_company, pf.created_at AS favorited_at
      FROM product_favorites pf
      JOIN products p ON pf.product_id = p.id
      JOIN users u ON p.seller_id = u.id
      WHERE pf.user_id = $1 AND p.status = 'active'
      ORDER BY pf.created_at DESC`, [req.user.id]);
    res.json({ favorites: rows });
  } catch (err) { next(err); }
});

// Soumettre un avis
router.post('/reviews', authenticate, async (req, res, next) => {
  try {
    const { reviewed_id, order_id, rating, title, comment } = req.body;

    // Vérifier que la commande existe et est livrée
    if (order_id) {
      const { rows: orders } = await query("SELECT id FROM orders WHERE id=$1 AND buyer_id=$2 AND status='delivered'", [order_id, req.user.id]);
      if (!orders.length) return res.status(400).json({ error: 'Commande invalide ou non livrée' });
    }

    const { rows } = await query(
      'INSERT INTO reviews (reviewer_id, reviewed_id, order_id, rating, title, comment, is_verified) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [req.user.id, reviewed_id, order_id || null, rating, title || null, comment || null, !!order_id]
    );

    // Recalculer la note moyenne du vendeur
    const { rows: avg } = await query('SELECT AVG(rating) AS avg, COUNT(*) AS count FROM reviews WHERE reviewed_id=$1', [reviewed_id]);
    await query('UPDATE users SET rating=$1, reviews_count=$2 WHERE id=$3', [parseFloat(avg[0].avg).toFixed(2), parseInt(avg[0].count), reviewed_id]);

    res.status(201).json({ review: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
