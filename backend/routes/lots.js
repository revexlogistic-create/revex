// routes/lots.js — Gestion des lots REVEX
const router  = require('express').Router();
const { query, withTransaction } = require('../config/db');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const slugify = s => s.toLowerCase()
  .replace(/[àáâ]/g,'a').replace(/[éèêë]/g,'e')
  .replace(/[îï]/g,'i').replace(/[ôö]/g,'o').replace(/[ùûü]/g,'u')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').substring(0,80);

const LOT_TYPES = { recyclage:'Recyclage matière première', diy:'Make It Yourself', industriel:'Pièces industrielles' };
const INDUSTRIES = ['Chimie & Phosphates','Ciment & BTP','Agroalimentaire','Énergie & Pétrole','Mines & Métallurgie','Textile','Automobile','Électronique','Hydraulique','Autre'];

// ── LISTE des lots ─────────────────────────────────────────────
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { type, sale_type, industry, status='active', page=1, limit=20 } = req.query;
    const params = [];
    const conds  = [`l.status IN ('active','auction_live')`];

    if (type)        conds.push(`l.lot_type = $${params.push(type)}`);
    if (sale_type)   conds.push(`l.sale_type = $${params.push(sale_type)}`);
    if (industry)    conds.push(`l.industry_category ILIKE $${params.push('%'+industry+'%')}`);

    const limitClause = `LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page)-1)*parseInt(limit)}`;

    const { rows } = await query(`
      SELECT l.*,
        u.company_name AS seller_company, u.city AS seller_city, u.rating AS seller_rating,
        COUNT(DISTINCT ab.id) AS bid_count,
        COUNT(DISTINCT li.id) AS items_count
      FROM lots l
      JOIN users u ON l.seller_id = u.id
      LEFT JOIN auction_bids ab ON ab.lot_id = l.id
      LEFT JOIN lot_items li ON li.lot_id = l.id
      WHERE ${conds.join(' AND ')}
      GROUP BY l.id, u.company_name, u.city, u.rating
      ORDER BY l.published_at DESC
      ${limitClause}
    `, params);

    const count = await query(`SELECT COUNT(*) FROM lots l WHERE ${conds.join(' AND ')}`, params);
    res.json({ lots:rows, total:parseInt(count.rows[0].count) });
  } catch(err){ next(err); }
});

// ── MON LOT (vendeur) ──────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT l.*,
        COUNT(DISTINCT ab.id) AS bid_count,
        COUNT(DISTINCT li.id) AS items_count,
        MAX(ab.amount) AS highest_bid
      FROM lots l
      LEFT JOIN auction_bids ab ON ab.lot_id = l.id
      LEFT JOIN lot_items li ON li.lot_id = l.id
      WHERE l.seller_id = $1
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `, [req.user.id]);
    res.json({ lots:rows });
  } catch(err){ next(err); }
});

// ── LOTS SURVEILLÉS par l'utilisateur ─────────────────────────
// IMPORTANT: doit être AVANT /:slug
router.get('/watched', authenticate, async (req, res, next) => {
  try {
    // Vérifier d'abord si la table existe
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'lot_watchers'
      ) AS exists
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({ lots: [], total: 0 });
    }

    const { rows } = await query(`
      SELECT l.*,
        u.company_name AS seller_company, u.city AS seller_city,
        COUNT(DISTINCT ab.id) AS bid_count,
        COALESCE(MAX(ab.amount), l.current_bid, l.start_price, l.price, 0) AS current_price,
        EXTRACT(EPOCH FROM (l.auction_end - NOW())) AS seconds_remaining
      FROM lot_watchers lw
      JOIN lots l ON lw.lot_id = l.id
      JOIN users u ON l.seller_id = u.id
      LEFT JOIN auction_bids ab ON ab.lot_id = l.id
      WHERE lw.user_id = $1
        AND l.status NOT IN ('cancelled', 'draft')
      GROUP BY l.id, u.company_name, u.city
      ORDER BY lw.created_at DESC
    `, [req.user.id]);

    res.json({ lots: rows, total: rows.length });
  } catch(err) {
    // Si erreur (table manquante etc), renvoyer vide sans crash
    console.error('watched lots error:', err.message);
    res.json({ lots: [], total: 0 });
  }
});

// ── DÉTAIL d'un lot ────────────────────────────────────────────
router.get('/:slug', optionalAuth, async (req, res, next) => {
  try {
    const isUUID = /^[0-9a-f-]{36}$/.test(req.params.slug);
    const field  = isUUID ? 'l.id' : 'l.slug';

    const { rows } = await query(`
      SELECT l.*,
        u.company_name AS seller_company, u.city AS seller_city,
        u.rating AS seller_rating, u.total_sales AS seller_sales,
        COUNT(DISTINCT ab.id) AS bid_count,
        MAX(ab.amount)       AS highest_bid,
        ${req.user ? `EXISTS(SELECT 1 FROM lot_watchers WHERE lot_id=l.id AND user_id=$2) AS is_watching,` : ''}
        EXTRACT(EPOCH FROM (l.auction_end - NOW())) AS seconds_remaining
      FROM lots l
      JOIN users u ON l.seller_id = u.id
      LEFT JOIN auction_bids ab ON ab.lot_id = l.id
      WHERE ${field} = $1
      GROUP BY l.id, u.company_name, u.city, u.rating, u.total_sales
    `, req.user ? [req.params.slug, req.user.id] : [req.params.slug]);

    if (!rows.length) return res.status(404).json({ error:'Lot introuvable' });
    const lot = rows[0];

    // Articles du lot
    const { rows: items } = await query(`
      SELECT li.*, p.title AS product_title, p.slug AS product_slug, p.images AS product_images
      FROM lot_items li
      LEFT JOIN products p ON li.product_id = p.id
      WHERE li.lot_id = $1
      ORDER BY li.sort_order, li.designation
    `, [lot.id]);

    // Historique enchères (public)
    const { rows: bids } = await query(`
      SELECT ab.amount, ab.created_at,
        u.company_name AS bidder_company,
        ab.is_winning
      FROM auction_bids ab
      JOIN users u ON ab.bidder_id = u.id
      WHERE ab.lot_id = $1
      ORDER BY ab.amount DESC
      LIMIT 20
    `, [lot.id]);

    // Incrémenter les vues
    query('UPDATE lots SET views_count=views_count+1 WHERE id=$1', [lot.id]).catch(()=>{});

    res.json({ lot, items, bids });
  } catch(err){ next(err); }
});

// ── CRÉER un lot ───────────────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      title, description, lot_type, sale_type='fixed_price',
      industry_category, price, negotiable=true,
      start_price, reserve_price, bid_increment=100,
      auction_start, auction_end,
      total_weight_kg, total_value_est,
      images=[], location_city, condition='mixed',
      blind_lot=false,
      items=[], status='draft'
    } = req.body;

    if (!title) return res.status(400).json({ error:'Titre obligatoire' });
    if (!lot_type || !['recyclage','diy','industriel'].includes(lot_type))
      return res.status(400).json({ error:'Type de lot invalide' });
    if (sale_type === 'auction' && !auction_end)
      return res.status(400).json({ error:'Date de fin d\'enchères obligatoire' });

    let slug = `${slugify(title)}-${uuidv4().split('-')[0]}`;

    let lotId;
    await withTransaction(async (client) => {
      const { rows } = await client.query(`
        INSERT INTO lots (
          seller_id, title, slug, description, lot_type, sale_type, industry_category,
          price, negotiable, start_price, reserve_price, bid_increment,
          auction_start, auction_end, total_weight_kg, total_value_est,
          images, location_city, condition, status,
          nb_items, published_at, blind_lot
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
        RETURNING *`,
        [
          req.user.id, title, slug, description||null, lot_type, sale_type,
          industry_category||null, price||null, negotiable,
          start_price||null, reserve_price||null, bid_increment,
          auction_start||null, auction_end||null,
          total_weight_kg||null, total_value_est||null,
          JSON.stringify(images), location_city||req.user.city||null,
          condition, status, items.length,
          status==='active' ? new Date() : null,
          blind_lot === true || blind_lot === 'true'
        ]
      );
      lotId = rows[0].id;

      // Insérer les articles
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await client.query(`
          INSERT INTO lot_items (lot_id, product_id, reference, designation, quantity, unit, unit_weight_kg, condition, notes, sort_order)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [lotId, it.product_id||null, it.reference||null, it.designation,
           it.quantity||1, it.unit||'unité', it.unit_weight_kg||null,
           it.condition||'used', it.notes||null, i]
        );
      }

      // Si enchère active, mettre current_bid = start_price
      if (sale_type==='auction' && start_price) {
        await client.query('UPDATE lots SET current_bid=$1, status=$2 WHERE id=$3',
          [start_price, status==='active'?'auction_live':'draft', lotId]);
      }
      return rows[0];
    });

    const { rows: created } = await query('SELECT * FROM lots WHERE id=$1', [lotId]);
    res.status(201).json({ message:'Lot créé avec succès', lot:created[0] });
  } catch(err){ next(err); }
});

// ── PLACER UNE ENCHÈRE ─────────────────────────────────────────
router.post('/:id/bid', authenticate, async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount)) return res.status(400).json({ error:'Montant invalide' });

    const { rows: lots } = await query(
      "SELECT * FROM lots WHERE id=$1 AND status='auction_live'", [req.params.id]
    );
    if (!lots.length) return res.status(404).json({ error:'Enchère introuvable ou terminée' });
    const lot = lots[0];

    if (lot.seller_id === req.user.id)
      return res.status(400).json({ error:'Vous ne pouvez pas enchérir sur votre propre lot' });

    const minBid = Number(lot.current_bid||lot.start_price||0) + Number(lot.bid_increment||100);
    if (Number(amount) < minBid)
      return res.status(400).json({ error:`Enchère minimum : ${minBid.toLocaleString('fr-MA')} MAD` });

    if (lot.auction_end && new Date() > new Date(lot.auction_end))
      return res.status(400).json({ error:'L\'enchère est terminée' });

    // Mettre à jour les anciennes enchères gagnantes
    await query('UPDATE auction_bids SET is_winning=false WHERE lot_id=$1', [req.params.id]);

    // Insérer la nouvelle enchère
    const { rows: bid } = await query(`
      INSERT INTO auction_bids (lot_id, bidder_id, amount, is_winning)
      VALUES ($1,$2,$3,true) RETURNING *`,
      [req.params.id, req.user.id, Number(amount)]
    );

    // Mettre à jour le lot
    await query('UPDATE lots SET current_bid=$1, updated_at=NOW() WHERE id=$2',
      [Number(amount), req.params.id]);

    // Notifier le vendeur
    query(`INSERT INTO notifications (user_id,type,title,body,data) VALUES ($1,'new_bid','💰 Nouvelle enchère !',$2,$3)`,
      [lot.seller_id,
       `${req.user.company_name} a enchéri ${Number(amount).toLocaleString('fr-MA')} MAD sur "${lot.title}"`,
       JSON.stringify({ lot_id:req.params.id, amount })]
    ).catch(()=>{});

    // Notifier l'ancien enchérisseur (surenchéri)
    const { rows: prevBids } = await query(
      'SELECT DISTINCT bidder_id FROM auction_bids WHERE lot_id=$1 AND bidder_id!=$2 LIMIT 5',
      [req.params.id, req.user.id]
    );
    for (const pb of prevBids) {
      query(`INSERT INTO notifications (user_id,type,title,body,data) VALUES ($1,'outbid','⚡ Vous avez été surenchéri !',$2,$3)`,
        [pb.bidder_id, `Quelqu'un a enchéri ${Number(amount).toLocaleString('fr-MA')} MAD sur "${lot.title}"`,
         JSON.stringify({ lot_id:req.params.id })]
      ).catch(()=>{});
    }

    res.status(201).json({ message:'Enchère placée !', bid:bid[0], new_current_bid:Number(amount) });
  } catch(err){ next(err); }
});

// ── SURVEILLER un lot ──────────────────────────────────────────
router.post('/:id/watch', authenticate, async (req, res, next) => {
  try {
    // Créer la table si elle n'existe pas
    await query(`
      CREATE TABLE IF NOT EXISTS lot_watchers (
        lot_id  UUID REFERENCES lots(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (lot_id, user_id)
      )
    `);

    const { rows } = await query(
      'SELECT 1 FROM lot_watchers WHERE lot_id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (rows.length) {
      await query('DELETE FROM lot_watchers WHERE lot_id=$1 AND user_id=$2', [req.params.id, req.user.id]);
      await query('UPDATE lots SET watchers_count=GREATEST(0,watchers_count-1) WHERE id=$1', [req.params.id]);
      return res.json({ watching:false });
    }
    await query('INSERT INTO lot_watchers (lot_id,user_id) VALUES ($1,$2)', [req.params.id, req.user.id]);
    await query('UPDATE lots SET watchers_count=watchers_count+1 WHERE id=$1', [req.params.id]);
    res.json({ watching:true });
  } catch(err){ next(err); }
});

// ── CLORE une enchère (admin ou cron) ─────────────────────────
router.put('/:id/close', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query("SELECT * FROM lots WHERE id=$1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error:'Lot introuvable' });
    const lot = rows[0];
    if (lot.seller_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error:'Non autorisé' });

    const { rows: winner } = await query(
      'SELECT * FROM auction_bids WHERE lot_id=$1 AND is_winning=true LIMIT 1', [lot.id]
    );

    const finalStatus = winner.length ? 'sold' : 'expired';
    await query(
      'UPDATE lots SET status=$1, auction_winner_id=$2 WHERE id=$3',
      [finalStatus, winner[0]?.bidder_id||null, lot.id]
    );

    if (winner.length) {
      query(`INSERT INTO notifications (user_id,type,title,body,data) VALUES ($1,'auction_won','🏆 Vous avez remporté l\'enchère !',$2,$3)`,
        [winner[0].bidder_id, `Félicitations ! Vous avez remporté le lot "${lot.title}" pour ${Number(winner[0].amount).toLocaleString('fr-MA')} MAD.`,
         JSON.stringify({ lot_id:lot.id })]
      ).catch(()=>{});
    }

    res.json({ message:`Enchère clôturée — ${finalStatus}`, winner:winner[0]||null });
  } catch(err){ next(err); }
});

// ── SUPPRIMER un lot (brouillon) ───────────────────────────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query("SELECT seller_id,status FROM lots WHERE id=$1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error:'Lot introuvable' });
    if (rows[0].seller_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error:'Non autorisé' });
    if (rows[0].status === 'auction_live')
      return res.status(400).json({ error:'Impossible de supprimer une enchère en cours' });

    await query("UPDATE lots SET status='cancelled' WHERE id=$1", [req.params.id]);
    res.json({ message:'Lot annulé' });
  } catch(err){ next(err); }
});

module.exports = router;

// ── ACHETER UN LOT (prix fixe) ─────────────────────────────────
router.post('/:id/buy', authenticate, async (req, res, next) => {
  try {
    const { rows: lots } = await query(
      "SELECT * FROM lots WHERE id=$1 AND status='active' AND sale_type='fixed_price'",
      [req.params.id]
    );
    if (!lots.length) return res.status(404).json({ error:'Lot indisponible ou non en vente à prix fixe' });
    const lot = lots[0];

    if (lot.seller_id === req.user.id)
      return res.status(400).json({ error:'Vous ne pouvez pas acheter votre propre lot' });
    if (!lot.price) return res.status(400).json({ error:'Prix non défini pour ce lot' });

    // 1. Marquer le lot comme vendu
    await query(
      "UPDATE lots SET status='sold', updated_at=NOW() WHERE id=$1",
      [lot.id]
    );

    // 2. Enregistrer l'acheteur sur le lot
    await query(
      "UPDATE lots SET auction_winner_id=$1 WHERE id=$2",
      [req.user.id, lot.id]
    );

    // 3. Notifier le vendeur (non bloquant)
    query(
      `INSERT INTO notifications (user_id,type,title,body,data) VALUES ($1,'lot_sold','🎉 Lot vendu !',$2,$3)`,
      [lot.seller_id,
       req.user.company_name + ' a acheté votre lot "' + lot.title + '" pour ' + Number(lot.price).toLocaleString('fr-MA') + ' MAD',
       JSON.stringify({ lot_id:lot.id, buyer_id:req.user.id })]
    ).catch(() => {});

    // 4. Notifier l'acheteur
    query(
      `INSERT INTO notifications (user_id,type,title,body,data) VALUES ($1,'lot_purchased','✅ Achat confirmé !',$2,$3)`,
      [req.user.id,
       'Vous avez acheté le lot "' + lot.title + '" pour ' + Number(lot.price).toLocaleString('fr-MA') + ' MAD. Contactez le vendeur pour la récupération.',
       JSON.stringify({ lot_id:lot.id })]
    ).catch(() => {});

    res.status(201).json({
      message: 'Achat confirmé ! Contactez le vendeur pour organiser la récupération.',
      lot_title: lot.title,
      amount: lot.price,
      seller_id: lot.seller_id
    });
  } catch(err) { next(err); }
});

// ── LOTS SURVEILLÉS par l'utilisateur ─────────────────────────