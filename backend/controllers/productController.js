// controllers/productController.js
const { query, withTransaction } = require('../config/db');
const slugify = require('slugify');
const { v4: uuidv4 } = require('uuid');

// ── LIST / SEARCH ─────────────────────────────────────────────
const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 12, search, category, condition,
      min_price, max_price, city, region, delivery_type,
      sort = 'newest', seller_id, status = 'active'
    } = req.query;

    const offset = (Math.max(parseInt(page), 1) - 1) * Math.min(parseInt(limit), 500);
    const params = [];
    const conditions = [];

    // Filtre statut (admin peut voir tout)
    if (req.user?.role === 'admin' && status !== 'all') {
      conditions.push(`p.status = $${params.push(status)}`);
    } else if (!req.user || req.user.role !== 'admin') {
      conditions.push(`p.status = 'active'`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.title ILIKE $${params.length} OR p.reference ILIKE $${params.length} OR p.brand ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }
    if (category) conditions.push(`(p.category_id = $${params.push(parseInt(category))} OR c.parent_id = $${params.length})`);
    if (condition) conditions.push(`p.condition = $${params.push(condition)}`);
    if (min_price) conditions.push(`p.price >= $${params.push(parseFloat(min_price))}`);
    if (max_price) conditions.push(`p.price <= $${params.push(parseFloat(max_price))}`);
    if (city) conditions.push(`p.location_city ILIKE $${params.push(`%${city}%`)}`);
    if (region) conditions.push(`p.location_region ILIKE $${params.push(`%${region}%`)}`);
    if (delivery_type) conditions.push(`(p.delivery_type = $${params.push(delivery_type)} OR p.delivery_type = 'both')`);
    if (seller_id) conditions.push(`p.seller_id = $${params.push(seller_id)}`);

    // Filtre marque véhicule (brand dans la navbar auto)
    const { brand: brandFilter, vehicle_make: vehicleMakeFilter, part_category: partCatFilter } = req.query;
    if (vehicleMakeFilter) conditions.push(`(p.vehicle_make ILIKE $${params.push('%'+vehicleMakeFilter+'%')} OR p.brand ILIKE $${params.length})`);
    if (brandFilter && !vehicleMakeFilter) conditions.push(`(p.brand ILIKE $${params.push('%'+brandFilter+'%')} OR p.vehicle_make ILIKE $${params.length})`);
    // Filtre catégorie pièce auto (freinage, moteur, etc.)
    if (partCatFilter) conditions.push(`(p.title ILIKE $${params.push('%'+partCatFilter+'%')} OR p.description ILIKE $${params.length})`);

    // Filtre marketplace auto — appliqué après la requête pour éviter erreur si colonne absente
    const { sector, is_auto } = req.query;
    // Filtre is_auto dans SQL
    if (is_auto === 'true')  conditions.push("COALESCE(p.is_auto, false) = true");
    if (is_auto === 'false') conditions.push("COALESCE(p.is_auto, false) = false");

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const sortMap = {
      newest: 'p.published_at DESC NULLS LAST, p.created_at DESC',
      oldest: 'p.created_at ASC',
      price_asc: 'p.price ASC',
      price_desc: 'p.price DESC',
      views: 'p.views_count DESC',
      popular: 'p.favorites_count DESC'
    };
    const orderBy = sortMap[sort] || sortMap.newest;

    const countResult = await query(
      `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    let rows;
    try {
    const result = await query(`
      SELECT
        p.id, p.title, p.slug, p.reference, p.brand, p.condition,
        p.quantity, p.unit, p.price, p.negotiable, p.price_on_request,
        p.weight_kg, p.location_city, p.location_region,
        p.delivery_type, p.eco_delivery_price, p.urgent_delivery_price,
        p.delivery_days_eco, p.delivery_days_urgent,
        p.images, p.status, p.is_featured, p.is_urgent_sale, p.dormant_since,
        p.views_count, p.favorites_count, p.inquiries_count,
        p.created_at, p.published_at,
        COALESCE(p.is_auto, false) AS is_auto,
        p.vehicle_make, p.vehicle_model, p.vehicle_year,
        p.urgent_mode,
        c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
        u.id AS seller_id, u.company_name AS seller_company,
        u.city AS seller_city, u.rating AS seller_rating, u.avatar_url AS seller_avatar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      ${where}
      ORDER BY ${orderBy}
      LIMIT ${Math.min(parseInt(limit), 500)} OFFSET ${offset}
    `, params);
    rows = result.rows;
    } catch (selErr) {
      // Fallback: migration pas faite — SELECT sans colonnes auto
      if (selErr.code === '42703') {
        // Colonne is_auto absente (migration non faite)
        if (is_auto === 'true') {
          // Marketplace auto : retourner vide + message
          rows = [];
          console.warn('[REVEX] Migration products_auto.sql non faite. Lancez: cd backend && node migrate.js');
        } else {
          // Catalogue PDR : retourner tous les produits sans filtre auto
          const safeWhere = conditions
            .filter(c => !c.includes('is_auto'))
            .reduce((w,c,i) => i===0?'WHERE '+c:w+' AND '+c, '');
          const fallback = await query(
            'SELECT p.id, p.title, p.slug, p.reference, p.brand, p.condition, p.quantity, p.unit, p.price, p.negotiable, p.price_on_request, p.weight_kg, p.location_city, p.location_region, p.delivery_type, p.eco_delivery_price, p.urgent_delivery_price, p.delivery_days_eco, p.delivery_days_urgent, p.images, p.status, p.is_featured, p.is_urgent_sale, p.dormant_since, p.views_count, p.favorites_count, p.inquiries_count, p.created_at, p.published_at, false AS is_auto, NULL AS vehicle_make, NULL AS vehicle_model, NULL AS vehicle_year, false AS urgent_mode, c.id AS category_id, c.name AS category_name, c.slug AS category_slug, u.id AS seller_id, u.company_name AS seller_company, u.city AS seller_city, u.rating AS seller_rating, u.avatar_url AS seller_avatar FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN users u ON p.seller_id = u.id ' + safeWhere + ' ORDER BY ' + orderBy + ' LIMIT ' + Math.min(parseInt(limit),500) + ' OFFSET ' + offset,
            params.slice(0, params.length - (is_auto ? 1 : 0))
          );
          rows = fallback.rows;
        }
      } else { throw selErr; }
    }

    const lim   = Math.min(parseInt(limit) || 24, 500);
    const pg    = Math.max(parseInt(page)  || 1, 1);
    const pages = Math.ceil(total / lim);

    res.json({
      products:   rows,
      total:      total,
      pagination: { total, page: pg, limit: lim, pages }
    });
  } catch (err) { next(err); }
};

// ── GET ONE ───────────────────────────────────────────────────
const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUUID = /^[0-9a-f-]{36}$/.test(id);
    const field = isUUID ? 'p.id' : 'p.slug';

    const { rows } = await query(`
      SELECT p.*, 
        c.name AS category_name, c.slug AS category_slug,
        u.id AS seller_id, u.company_name AS seller_company,
        u.contact_name AS seller_contact, u.city AS seller_city,
        u.region AS seller_region, u.phone AS seller_phone,
        u.rating AS seller_rating, u.reviews_count AS seller_reviews,
        u.total_sales AS seller_sales, u.avatar_url AS seller_avatar,
        u.created_at AS seller_since
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.seller_id = u.id
      WHERE ${field} = $1 AND (p.status = 'active' OR $2)
    `, [id, req.user?.role === 'admin']);

    if (!rows.length) return res.status(404).json({ error: 'Produit introuvable' });

    // Incrémenter les vues (async, sans bloquer)
    query('UPDATE products SET views_count = views_count + 1 WHERE id = $1', [rows[0].id]).catch(() => {});

    // Produits similaires
    const similar = await query(`
      SELECT id, title, slug, price, condition, images, location_city
      FROM products
      WHERE category_id = $1 AND id != $2 AND status = 'active'
      ORDER BY RANDOM() LIMIT 4
    `, [rows[0].category_id, rows[0].id]);

    // Vérifier si l'utilisateur a mis en favori
    let isFavorite = false;
    if (req.user) {
      const fav = await query('SELECT 1 FROM product_favorites WHERE user_id = $1 AND product_id = $2', [req.user.id, rows[0].id]);
      isFavorite = fav.rows.length > 0;
    }

    res.json({ product: { ...rows[0], is_favorite: isFavorite }, similar: similar.rows });
  } catch (err) { next(err); }
};

// ── CREATE ────────────────────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    const {
      title, category_id, reference, brand, model, description, specifications,
      condition, quantity, unit, price, negotiable, price_on_request,
      weight_kg, dimensions, location_city, location_region,
      delivery_type, eco_delivery_price, urgent_delivery_price,
      delivery_days_eco, delivery_days_urgent, images, documents,
      dormant_since, tags, status = 'draft',
      is_auto, vehicle_make, vehicle_model, vehicle_year,
      is_featured, urgent_mode, warranty_months, sla_available
    } = req.body;

    // Générer slug unique
    let slug = slugify(title, { lower: true, strict: true, locale: 'fr' });
    const existing = await query('SELECT id FROM products WHERE slug LIKE $1', [`${slug}%`]);
    if (existing.rows.length) slug = `${slug}-${uuidv4().split('-')[0]}`;

    const sellerId = req.user.role === 'admin' ? (req.body.seller_id || req.user.id) : req.user.id;

    const baseParams = [
      sellerId, category_id||null, title, slug, reference||null, brand||null, model||null, description||null,
      JSON.stringify(specifications||{}), condition||'new', quantity||1, unit||'piece',
      price, negotiable!==false, price_on_request||false, weight_kg||null,
      JSON.stringify(dimensions||{}), location_city||null, location_region||null, delivery_type||'both',
      eco_delivery_price||null, urgent_delivery_price||null, delivery_days_eco||null, delivery_days_urgent||null,
      JSON.stringify(images||[]), JSON.stringify(documents||[]),
      status, dormant_since||null, null,
      !!urgent_mode, status==='active'?new Date():null
    ];

    let rows;
    try {
      // Essai avec colonnes auto (migration faite)
      const r = await query(
        'INSERT INTO products (seller_id,category_id,title,slug,reference,brand,model,description,specifications,condition,quantity,unit,price,negotiable,price_on_request,weight_kg,dimensions,location_city,location_region,delivery_type,eco_delivery_price,urgent_delivery_price,delivery_days_eco,delivery_days_urgent,images,documents,status,dormant_since,tags,urgent_mode,published_at,is_auto,vehicle_make,vehicle_model,vehicle_year) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35) RETURNING *',
        [...baseParams, !!is_auto, vehicle_make||null, vehicle_model||null, vehicle_year?Number(vehicle_year):null]
      );
      rows = r.rows;
    } catch (colErr) {
      if (colErr.code === '42703') {
        // Migration pas encore faite — fallback sans colonnes auto
        console.warn('[createProduct] Migration products_auto.sql non faite — publication sans champs auto');
        const r = await query(
          'INSERT INTO products (seller_id,category_id,title,slug,reference,brand,model,description,specifications,condition,quantity,unit,price,negotiable,price_on_request,weight_kg,dimensions,location_city,location_region,delivery_type,eco_delivery_price,urgent_delivery_price,delivery_days_eco,delivery_days_urgent,images,documents,status,dormant_since,tags,urgent_mode,published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31) RETURNING *',
          baseParams
        );
        rows = r.rows;
      } else { throw colErr; }
    }

    res.status(201).json({ message: 'Produit créé avec succès', product: rows[0] });
  } catch (err) { next(err); }
};

// ── PUBLICATION EN MASSE — Stock dormant critique CCOM ────────
const bulkPublish = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'Aucun article à publier' });

    const sellerId = req.user.id;
    const results  = { created: 0, updated: 0, skipped: 0, errors: [] };

    // ── Filtrer UNIQUEMENT la classe dormant_critique ─────────
    const dormantsCritiques = items.filter(item =>
      item.est_dormant === true ||
      item.classe === 'dormant_critique' ||
      item.ccom_score < 25
    );

    if (dormantsCritiques.length === 0)
      return res.status(400).json({ error: 'Aucun article de classe "Dormant Critique" (Score < 25) trouvé' });

    for (const item of dormantsCritiques) {
      try {
        const title = String(item.name || item.reference || 'Article').substring(0, 280).trim();
        if (!title) { results.skipped++; continue; }

        // ── Prix — essayer tous les champs possibles ──────────
        let price = Number(
          item.prix_unitaire  ||   // champ CCOM analyse
          item.prix           ||   // champ Excel brut
          item.price          ||   // alias anglais
          item.pu             ||   // prix unitaire court
          0
        );

        // Fallback : calculer depuis valeur_totale / quantite
        if (price === 0 && item.valeur_totale && qty > 0) {
          price = Math.round(Number(item.valeur_totale) / qty);
        }

        // Debug log pour identifier le problème
        console.log(`[bulkPublish] ${item.reference} → prix_unitaire:${item.prix_unitaire} prix:${item.prix} price:${item.price} valeur_totale:${item.valeur_totale} → price final:${price}`);

        // Si toujours 0, mettre "prix sur demande" plutôt que 0
        const priceOnRequest = price === 0;
        const qty      = parseInt(item.quantite || item.quantity || 1);
        const ecoPrix  = Math.max(50,  Math.round(price * 0.05));
        const urgentPrix = Math.max(150, Math.round(price * 0.12));

        const condRaw = String(item.condition || item.grade || 'new').toLowerCase();
        let condition = 'new';
        if (condRaw.includes('b') || condRaw.includes('bon') || condRaw.includes('good')) condition = 'good';
        else if (condRaw.includes('c') || condRaw.includes('used') || condRaw.includes('usage')) condition = 'used';

        let dormantSince = null;
        if (item.derniere_sortie) {
          dormantSince = String(item.derniere_sortie).substring(0, 10);
        } else if (item.age_mois) {
          const d = new Date();
          d.setMonth(d.getMonth() - parseInt(item.age_mois));
          dormantSince = d.toISOString().split('T')[0];
        }

        // ── Si référence existe → ajouter la quantité ─────────
        if (item.reference) {
          const { rows: existing } = await query(
            "SELECT id, quantity FROM products WHERE seller_id=$1 AND reference=$2 AND status != 'archived'",
            [sellerId, String(item.reference).substring(0, 100)]
          );

          if (existing.length > 0) {
            // Produit existant → on additionne la quantité
            const newQty = existing[0].quantity + qty;
            await query(
              "UPDATE products SET quantity=$1, status='active', updated_at=NOW() WHERE id=$2",
              [newQty, existing[0].id]
            );
            results.updated++;
            continue;
          }
        }

        // ── Nouveau produit → INSERT ───────────────────────────
        let slugBase = title.toLowerCase()
          .replace(/[àáâ]/g, 'a').replace(/[éèêë]/g, 'e')
          .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ùûü]/g, 'u')
          .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60);
        if (!slugBase) slugBase = 'article';
        const slug = `${slugBase}-${Date.now()}`;

        await query(`
          INSERT INTO products (
            seller_id, title, slug, reference, condition, quantity, unit,
            price, negotiable, price_on_request,
            location_city, location_region,
            delivery_type, eco_delivery_price, urgent_delivery_price,
            delivery_days_eco, delivery_days_urgent,
            status, dormant_since, images, specifications, published_at
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
            'active',$18,'[]','{}',NOW()
          )`,
          [
            sellerId, title, slug,
            item.reference ? String(item.reference).substring(0, 100) : null,
            condition, qty, 'unité',
            price || 1,          // jamais 0 en base
            true,
            priceOnRequest,
            req.user.city || null, req.user.region || null,
            'both', ecoPrix, urgentPrix, 5, 2, dormantSince
          ]
        );
        results.created++;

      } catch (itemErr) {
        results.errors.push(`${item.reference || item.name}: ${itemErr.message}`);
      }
    }

    res.status(201).json({
      message: `Publication terminée : ${results.created} créé(s), ${results.updated} mis à jour (quantité ajoutée), ${results.skipped} ignoré(s)`,
      total_dormants_critiques: dormantsCritiques.length,
      created: results.created,
      updated: results.updated,
      skipped: results.skipped,
      errors:  results.errors
    });
  } catch (err) { next(err); }
};
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows: existing } = await query('SELECT * FROM products WHERE id = $1', [id]);
    if (!existing.length) return res.status(404).json({ error: 'Produit introuvable' });
    if (req.user.role !== 'admin' && existing[0].seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Non autorisé' });
    }

    const fields = ['category_id','reference','brand','model','description','specifications','condition','quantity','unit','price','negotiable','price_on_request','weight_kg','dimensions','location_city','location_region','delivery_type','eco_delivery_price','urgent_delivery_price','delivery_days_eco','delivery_days_urgent','images','documents','status','dormant_since','tags','is_featured','is_urgent_sale'];
    const updates = [];
    const params = [];

    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        params.push(typeof req.body[f] === 'object' && !Array.isArray(req.body[f]) ? JSON.stringify(req.body[f]) : req.body[f]);
        updates.push(`${f} = $${params.length}`);
      }
    });

    // Gérer le published_at lors de la mise en active
    if (req.body.status === 'active' && existing[0].status !== 'active') {
      updates.push(`published_at = NOW()`);
    }

    if (!updates.length) return res.status(400).json({ error: 'Aucune modification' });
    params.push(id);
    const { rows } = await query(`UPDATE products SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`, params);

    res.json({ message: 'Produit mis à jour', product: rows[0] });
  } catch (err) { next(err); }
};

// ── DELETE ────────────────────────────────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query('SELECT seller_id FROM products WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Produit introuvable' });
    if (req.user.role !== 'admin' && rows[0].seller_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' });

    // Archiver plutôt que supprimer (soft delete)
    await query("UPDATE products SET status = 'archived' WHERE id = $1", [id]);
    res.json({ message: 'Produit archivé avec succès' });
  } catch (err) { next(err); }
};

// ── TOGGLE FAVORITE ───────────────────────────────────────────
const toggleFavorite = async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await query('SELECT 1 FROM product_favorites WHERE user_id = $1 AND product_id = $2', [req.user.id, id]);

    if (existing.rows.length) {
      await query('DELETE FROM product_favorites WHERE user_id = $1 AND product_id = $2', [req.user.id, id]);
      await query('UPDATE products SET favorites_count = GREATEST(favorites_count - 1, 0) WHERE id = $1', [id]);
      res.json({ favorite: false, message: 'Retiré des favoris' });
    } else {
      await query('INSERT INTO product_favorites (user_id, product_id) VALUES ($1, $2)', [req.user.id, id]);
      await query('UPDATE products SET favorites_count = favorites_count + 1 WHERE id = $1', [id]);
      res.json({ favorite: true, message: 'Ajouté aux favoris' });
    }
  } catch (err) { next(err); }
};

// ── SELLER'S PRODUCTS ─────────────────────────────────────────
const getMyProducts = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 0 } = req.query;
    const params = [req.user.id];
    const cond = status ? `AND p.status = $${params.push(status)}` : '';
    const limitClause = parseInt(limit) > 0
      ? `LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page)-1)*parseInt(limit)}`
      : '';

    const { rows } = await query(`
      SELECT p.*,
        c.name AS category_name,
        COALESCE((SELECT COUNT(*) FROM orders o WHERE o.product_id = p.id), 0) AS orders_count,
        COALESCE((SELECT COUNT(*) FROM product_favorites pf WHERE pf.product_id = p.id), 0) AS favorites_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.seller_id = $1 ${cond}
      ORDER BY p.created_at DESC
      ${limitClause}
    `, params);

    const count = await query(`SELECT COUNT(*) FROM products WHERE seller_id = $1 ${cond}`, params);
    // Ensure is_auto is always present
    const safeRows = rows.map(r => ({ ...r, is_auto: r.is_auto === true }));
    res.json({ products: safeRows, total: parseInt(count.rows[0].count) });
  } catch (err) { next(err); }
};

module.exports = { getProducts, getProduct, createProduct, bulkPublish, updateProduct, deleteProduct, toggleFavorite, getMyProducts };
