// routes/products.js
const router  = require('express').Router();
const ctrl    = require('../controllers/productController');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const { requireTokens } = require('../middleware/tokens');

router.get('/',         optionalAuth, ctrl.getProducts);
router.get('/me',       authenticate, ctrl.getMyProducts);
router.post('/bulk-publish', authenticate, authorize('seller','admin','distributor'),
  requireTokens('bulk_publish', req => req.body?.items?.length || 1),
  ctrl.bulkPublish);
router.get('/:id',      optionalAuth, ctrl.getProduct);
router.post('/',        authenticate, authorize('seller','admin','distributor'),
  requireTokens('publish_product'),
  ctrl.createProduct);
router.put('/:id',      authenticate, ctrl.updateProduct);
router.delete('/:id',   authenticate, ctrl.deleteProduct);
router.post('/:id/favorite', authenticate, ctrl.toggleFavorite);

module.exports = router;
// -- Ajouter dans backend/routes/products.js -----------------
// Juste avant module.exports = router;

// PUT /api/products/:slug — Modifier un produit existant
router.put('/:slug', authenticate, authorize('seller', 'distributor', 'admin'), async (req, res) => {
  try {
    const { slug } = req.params;

    // Vérifier que le produit appartient à cet utilisateur
    const existing = await pool.query(
      'SELECT * FROM products WHERE slug = $1 OR id::text = $1',
      [slug]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Produit introuvable' });
    }

    const product = existing.rows[0];

    // Seul le propriétaire ou admin peut modifier
    if (product.seller_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const {
      title, description, price, quantity, condition,
      part_category, reference, brand, location_city,
      delivery_type, eco_delivery_price, urgent_delivery_price,
      vehicle_make, vehicle_model, vehicle_year, vehicle_year_end,
      urgent_mode, images, negotiable,
    } = req.body;

    // Générer un nouveau slug si le titre a changé
    let newSlug = product.slug;
    if (title && title !== product.title) {
      const base = title
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      newSlug = base + '-' + Date.now().toString(36);
    }

    const imagesJson = images
      ? (Array.isArray(images) ? JSON.stringify(images) : images)
      : product.images;

    const result = await pool.query(
      `UPDATE products SET
        title              = COALESCE($1,  title),
        description        = COALESCE($2,  description),
        price              = COALESCE($3,  price),
        quantity           = COALESCE($4,  quantity),
        condition          = COALESCE($5,  condition),
        part_category      = COALESCE($6,  part_category),
        reference          = COALESCE($7,  reference),
        brand              = COALESCE($8,  brand),
        location_city      = COALESCE($9,  location_city),
        delivery_type      = COALESCE($10, delivery_type),
        eco_delivery_price = COALESCE($11, eco_delivery_price),
        urgent_delivery_price = COALESCE($12, urgent_delivery_price),
        vehicle_make       = COALESCE($13, vehicle_make),
        vehicle_model      = COALESCE($14, vehicle_model),
        vehicle_year       = COALESCE($15, vehicle_year),
        vehicle_year_end   = COALESCE($16, vehicle_year_end),
        urgent_mode        = COALESCE($17, urgent_mode),
        images             = COALESCE($18::jsonb, images),
        negotiable         = COALESCE($19, negotiable),
        slug               = $20,
        updated_at         = NOW()
       WHERE id = $21
       RETURNING *`,
      [
        title         || null,
        description   || null,
        price         ? Number(price)    : null,
        quantity      ? Number(quantity) : null,
        condition     || null,
        part_category || null,
        reference     || null,
        brand         || null,
        location_city || null,
        delivery_type || null,
        eco_delivery_price    ? Number(eco_delivery_price)    : null,
        urgent_delivery_price ? Number(urgent_delivery_price) : null,
        vehicle_make  || null,
        vehicle_model || null,
        vehicle_year  || null,
        vehicle_year_end || null,
        urgent_mode !== undefined ? urgent_mode : null,
        imagesJson    || null,
        negotiable    !== undefined ? negotiable : null,
        newSlug,
        product.id,
      ]
    );

    res.json({ product: result.rows[0], message: 'Produit mis à jour' });

  } catch (err) {
    console.error('[PUT /products/:slug]', err.message);
    res.status(500).json({ error: err.message });
  }
});
