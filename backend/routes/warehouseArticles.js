// backend/routes/warehouseArticles.js — Articles stockés dans les entrepôts
const express  = require('express');
const router   = express.Router({ mergeParams: true }); // pour hériter :warehouseId
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const isAdmin = [authenticate, authorize('admin')];

// ── GET tous les articles d'un entrepôt ──────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { warehouseId } = req.params;
    const { status, search } = req.query;

    let where = 'WHERE wa.warehouse_id = $1';
    const params = [warehouseId];

    if (status) {
      params.push(status);
      where += ' AND wa.status = $' + params.length;
    }
    if (search) {
      params.push('%' + search.toLowerCase() + '%');
      where += ' AND (LOWER(wa.title) LIKE $' + params.length +
               ' OR LOWER(wa.reference) LIKE $' + params.length +
               ' OR LOWER(wa.category) LIKE $' + params.length + ')';
    }

    const { rows } = await query(`
      SELECT wa.*,
        p.slug  AS product_slug,
        p.images AS product_images,
        p.status AS product_status
      FROM warehouse_articles wa
      LEFT JOIN products p ON p.id = wa.product_id
      ${where}
      ORDER BY wa.status, wa.entree_date DESC`,
      params
    );

    // Stats agrégées
    const stats = {
      total:       rows.length,
      en_stock:    rows.filter(r => r.status === 'en_stock').length,
      reserve:     rows.filter(r => r.status === 'reserve').length,
      expedie:     rows.filter(r => r.status === 'expedie').length,
      sorti:       rows.filter(r => r.status === 'sorti').length,
      total_vol:   rows.reduce((s, r) => s + Number(r.volume_m3 || 0), 0),
      total_val:   rows.reduce((s, r) => s + (Number(r.unit_price || 0) * Number(r.quantity || 0)), 0),
    };

    res.json({ articles: rows, stats });
  } catch (err) { next(err); }
});

// ── GET un article ────────────────────────────────────────────
router.get('/:articleId', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT wa.*, p.slug AS product_slug, p.images AS product_images
      FROM warehouse_articles wa
      LEFT JOIN products p ON p.id = wa.product_id
      WHERE wa.id = $1 AND wa.warehouse_id = $2`,
      [req.params.articleId, req.params.warehouseId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Article introuvable' });
    res.json({ article: rows[0] });
  } catch (err) { next(err); }
});

// ── POST ajouter des articles depuis une demande de stockage ──
router.post('/from-request/:requestId', ...isAdmin, async (req, res, next) => {
  try {
    const { warehouseId, requestId } = req.params;

    // Charger la demande + ses produits
    const { rows: reqs } = await query(`
      SELECT sr.*, u.company_name AS seller_company, u.id AS seller_uid
      FROM storage_requests sr
      JOIN users u ON u.id = sr.seller_id
      WHERE sr.id = $1 AND sr.status = 'active'`,
      [requestId]
    );
    if (!reqs.length) return res.status(404).json({ error: 'Demande active introuvable' });
    const req2 = reqs[0];

    const productIds = Array.isArray(req2.selected_product_ids)
      ? req2.selected_product_ids
      : JSON.parse(req2.selected_product_ids || '[]');

    const inserted = [];

    // Ajouter les produits publiés
    if (productIds.length > 0) {
      const { rows: products } = await query(
        'SELECT * FROM products WHERE id = ANY($1)',
        [productIds]
      );
      for (const p of products) {
        const { rows } = await query(`
          INSERT INTO warehouse_articles
            (warehouse_id, storage_request_id, product_id, title, reference, category,
             quality_grade, quantity, unit, unit_price, seller_id, seller_company, entree_date)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CURRENT_DATE)
          ON CONFLICT DO NOTHING
          RETURNING *`,
          [warehouseId, requestId, p.id, p.title, p.reference, p.category_name,
           p.quality_grade, p.quantity || 1, p.unit || 'u.', p.price,
           req2.seller_uid, req2.seller_company]
        );
        if (rows.length) inserted.push(rows[0]);
      }
    }

    // Ajouter les articles libres (custom_items)
    if (req2.custom_items) {
      const { rows } = await query(`
        INSERT INTO warehouse_articles
          (warehouse_id, storage_request_id, title, quantity, seller_id, seller_company, entree_date, condition_notes)
        VALUES ($1,$2,$3,1,$4,$5,CURRENT_DATE,$6)
        RETURNING *`,
        [warehouseId, requestId, 'Articles divers : ' + req2.custom_items.substring(0, 200),
         req2.seller_uid, req2.seller_company, req2.custom_items]
      );
      if (rows.length) inserted.push(rows[0]);
    }

    res.status(201).json({
      articles: inserted,
      message: inserted.length + ' article(s) ajouté(s) à l\'entrepôt.',
    });
  } catch (err) { next(err); }
});

// ── POST ajouter un article manuellement ─────────────────────
router.post('/', ...isAdmin, async (req, res, next) => {
  try {
    const { warehouseId } = req.params;
    const {
      title, reference, category, quality_grade, quantity, unit, unit_price,
      weight_kg, volume_m3, dimensions, zone, shelf, position,
      seller_id, seller_company, entree_date, condition_notes,
    } = req.body;

    if (!title) return res.status(400).json({ error: 'La désignation est obligatoire' });

    const { rows } = await query(`
      INSERT INTO warehouse_articles
        (warehouse_id, title, reference, category, quality_grade, quantity, unit,
         unit_price, weight_kg, volume_m3, dimensions, zone, shelf, position,
         seller_id, seller_company, entree_date, condition_notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING *`,
      [warehouseId, title, reference || null, category || null, quality_grade || null,
       Number(quantity || 1), unit || 'u.', unit_price ? Number(unit_price) : null,
       weight_kg ? Number(weight_kg) : null, volume_m3 ? Number(volume_m3) : null,
       dimensions || null, zone || null, shelf || null, position || null,
       seller_id || null, seller_company || null,
       entree_date || new Date().toISOString().split('T')[0],
       condition_notes || null]
    );

    res.status(201).json({ article: rows[0], message: 'Article ajouté.' });
  } catch (err) { next(err); }
});

// ── PUT modifier un article ───────────────────────────────────
router.put('/:articleId', ...isAdmin, async (req, res, next) => {
  try {
    const { zone, shelf, position, status, condition_notes, quantity, sortie_date } = req.body;

    const { rows } = await query(`
      UPDATE warehouse_articles SET
        zone            = COALESCE($1, zone),
        shelf           = COALESCE($2, shelf),
        position        = COALESCE($3, position),
        status          = COALESCE($4, status),
        condition_notes = COALESCE($5, condition_notes),
        quantity        = COALESCE($6, quantity),
        sortie_date     = COALESCE($7, sortie_date)
      WHERE id = $8 AND warehouse_id = $9
      RETURNING *`,
      [zone, shelf, position, status, condition_notes,
       quantity ? Number(quantity) : null, sortie_date || null,
       req.params.articleId, req.params.warehouseId]
    );

    if (!rows.length) return res.status(404).json({ error: 'Article introuvable' });
    res.json({ article: rows[0], message: 'Article mis à jour.' });
  } catch (err) { next(err); }
});

// ── DELETE retirer un article ─────────────────────────────────
router.delete('/:articleId', ...isAdmin, async (req, res, next) => {
  try {
    const { rowCount } = await query(
      'DELETE FROM warehouse_articles WHERE id=$1 AND warehouse_id=$2',
      [req.params.articleId, req.params.warehouseId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Article introuvable' });
    res.json({ message: 'Article retiré de l\'entrepôt.' });
  } catch (err) { next(err); }
});

module.exports = router;
