// controllers/orderController.js
const { query, withTransaction } = require('../config/db');

const generateOrderNumber = () =>
  `ORD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

// ── CRÉER COMMANDE ────────────────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { product_id, quantity, delivery_type = 'eco', delivery_address, notes } = req.body;

    if (!product_id) return res.status(400).json({ error: 'product_id manquant' });
    if (!quantity || quantity < 1) return res.status(400).json({ error: 'Quantité invalide' });

    // Exécuter la transaction — res.json() HORS de withTransaction
    let orderResult;
    try {
      orderResult = await withTransaction(async (client) => {

        // Vérifier produit disponible
        const { rows: products } = await client.query(
          "SELECT * FROM products WHERE id = $1 AND status = 'active' FOR UPDATE",
          [product_id]
        );
        if (!products.length) throw { status: 404, message: 'Produit indisponible ou non actif' };
        const product = products[0];

        if (product.seller_id === req.user.id)
          throw { status: 400, message: 'Vous ne pouvez pas acheter votre propre produit' };
        if (parseInt(quantity) > parseInt(product.quantity))
          throw { status: 400, message: `Stock insuffisant (disponible: ${product.quantity})` };

        const unit_price    = Number(product.price) || 0;
        const qty           = parseInt(quantity);
        const total_price   = unit_price * qty;
        const delivery_price = delivery_type === 'urgent'
          ? Number(product.urgent_delivery_price || 0)
          : Number(product.eco_delivery_price    || 0);
        const final_price   = total_price + delivery_price;

        // Créer la commande
        const { rows } = await client.query(`
          INSERT INTO orders
            (order_number, buyer_id, seller_id, product_id, quantity,
             unit_price, total_price, delivery_type, delivery_price,
             final_price, delivery_address, notes, status)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending')
          RETURNING *`,
          [generateOrderNumber(), req.user.id, product.seller_id,
           product_id, qty, unit_price, total_price,
           delivery_type, delivery_price, final_price,
           JSON.stringify(delivery_address || {}), notes || null]
        );

        // Décrémenter stock
        await client.query(
          'UPDATE products SET quantity = quantity - $1 WHERE id = $2',
          [qty, product_id]
        );
        // Si stock épuisé → sold
        if (product.quantity - qty <= 0) {
          await client.query("UPDATE products SET status = 'sold' WHERE id = $1", [product_id]);
        }

        // Notification vendeur (non bloquante)
        client.query(
          `INSERT INTO notifications (user_id, type, title, body, data)
           VALUES ($1,'new_order','Nouvelle commande reçue',$2,$3)`,
          [product.seller_id,
           `${req.user.company_name || 'Un acheteur'} a commandé : ${product.title}`,
           JSON.stringify({ order_id: rows[0].id })]
        ).catch(() => {});

        return rows[0]; // ← retourner les données, PAS res.json()
      });
    } catch (txErr) {
      // Erreur métier (status + message) ou DB
      const status = txErr.status || 500;
      const msg    = txErr.message || 'Erreur lors de la commande';
      return res.status(status).json({ error: msg });
    }

    // ← Répondre APRÈS le commit de la transaction
    return res.status(201).json({
      message: 'Commande créée avec succès',
      order: orderResult
    });

  } catch (err) {
    next(err);
  }
};

// ── MES COMMANDES (sans limite hardcodée) ─────────────────────
const getMyOrders = async (req, res, next) => {
  try {
    const {
      role_as = 'buyer',
      status,
      page  = 1,
      limit = 0  // 0 = illimité
    } = req.query;

    const roleField = role_as === 'seller' ? 'o.seller_id' : 'o.buyer_id';
    const params    = [req.user.id];
    const cond      = status ? `AND o.status = $${params.push(status)}` : '';

    const limitClause = parseInt(limit) > 0
      ? `LIMIT ${parseInt(limit)} OFFSET ${(parseInt(page) - 1) * parseInt(limit)}`
      : '';

    const { rows } = await query(`
      SELECT
        o.*,
        p.title AS product_title,
        p.images AS product_images,
        p.slug AS product_slug,
        p.reference AS product_reference,
        buyer.company_name  AS buyer_company,
        buyer.city          AS buyer_city,
        seller.company_name AS seller_company,
        seller.city         AS seller_city,
        seller.phone        AS seller_phone
      FROM orders o
      JOIN products p  ON o.product_id  = p.id
      JOIN users buyer  ON o.buyer_id   = buyer.id
      JOIN users seller ON o.seller_id  = seller.id
      WHERE ${roleField} = $1 ${cond}
      ORDER BY o.created_at DESC
      ${limitClause}
    `, params);

    const countResult = await query(
      `SELECT COUNT(*) FROM orders o WHERE ${roleField} = $1 ${cond}`, params
    );

    res.json({ orders: rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) { next(err); }
};

// ── UPDATE STATUT COMMANDE ────────────────────────────────────
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, cancel_reason } = req.body;
    const allowed = ['confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!allowed.includes(status))
      return res.status(400).json({ error: 'Statut invalide' });

    const { rows: orders } = await query(
      'SELECT * FROM orders WHERE id = $1', [id]
    );
    if (!orders.length)
      return res.status(404).json({ error: 'Commande introuvable' });
    const order = orders[0];

    const isAdmin  = req.user.role === 'admin';
    const isSeller = order.seller_id === req.user.id;
    const isBuyer  = order.buyer_id  === req.user.id;

    if (status === 'confirmed' && !isSeller && !isAdmin)
      return res.status(403).json({ error: 'Seul le vendeur peut confirmer' });
    if (status === 'shipped'   && !isSeller && !isAdmin)
      return res.status(403).json({ error: 'Seul le vendeur peut expédier' });
    if (status === 'delivered' && !isBuyer  && !isAdmin)
      return res.status(403).json({ error: 'Seul l\'acheteur peut confirmer la réception' });
    if (status === 'cancelled' && !isSeller && !isBuyer && !isAdmin)
      return res.status(403).json({ error: 'Non autorisé' });

    const tsField = {
      confirmed: 'confirmed_at',
      shipped:   'shipped_at',
      delivered: 'delivered_at',
      cancelled: 'cancelled_at'
    }[status];

    const params = cancel_reason ? [status, id, cancel_reason] : [status, id];
    const setCancelReason = cancel_reason ? ', cancel_reason = $3' : '';

    const { rows } = await query(
      `UPDATE orders SET status = $1, ${tsField} = NOW() ${setCancelReason} WHERE id = $2 RETURNING *`,
      params
    );

    // Remettre en stock si annulé
    if (status === 'cancelled') {
      await query(
        `UPDATE products
         SET quantity = quantity + $1,
             status = CASE WHEN status = 'sold' THEN 'active' ELSE status END
         WHERE id = $2`,
        [order.quantity, order.product_id]
      );
    }

    // Notification
    const notifUser = isSeller ? order.buyer_id : order.seller_id;
    const notifMsg  = {
      confirmed: 'Votre commande a été confirmée par le vendeur.',
      shipped:   'Votre commande a été expédiée.',
      delivered: 'Réception confirmée. Paiement libéré.',
      cancelled: `Commande annulée.${cancel_reason ? ' Motif: ' + cancel_reason : ''}`
    }[status];

    query(
      `INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1,'order_update',$2,$3,$4)`,
      [notifUser, `Commande ${order.order_number}`, notifMsg,
       JSON.stringify({ order_id: id, status })]
    ).catch(() => {});

    res.json({ message: 'Statut mis à jour', order: rows[0] });
  } catch (err) { next(err); }
};

module.exports = { createOrder, getMyOrders, updateOrderStatus };

// ============================================================
// quoteController (exporté séparément pour routes/quotes.js)
// ============================================================
const createQuote = async (req, res, next) => {
  try {
    const { product_id, quantity, proposed_price, message, delivery_type } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id manquant' });

    const { rows: products } = await query(
      "SELECT seller_id FROM products WHERE id=$1 AND status='active'", [product_id]
    );
    if (!products.length) return res.status(404).json({ error: 'Produit introuvable' });
    if (products[0].seller_id === req.user.id)
      return res.status(400).json({ error: 'Vous ne pouvez pas faire un devis sur votre propre produit' });

    const expires = new Date(Date.now() + 7*24*60*60*1000);
    const { rows } = await query(
      `INSERT INTO quotes (product_id,buyer_id,seller_id,quantity,proposed_price,message,delivery_type,expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [product_id, req.user.id, products[0].seller_id,
       quantity, proposed_price||null, message||null, delivery_type||null, expires]
    );

    query("UPDATE products SET inquiries_count=COALESCE(inquiries_count,0)+1 WHERE id=$1", [product_id]).catch(()=>{});
    query(`INSERT INTO notifications (user_id,type,title,body,data) VALUES ($1,'new_quote','Nouvelle demande de devis',$2,$3)`,
      [products[0].seller_id,
       `${req.user.company_name||'Un acheteur'} vous a envoyé un devis`,
       JSON.stringify({ quote_id: rows[0].id })]
    ).catch(()=>{});

    res.status(201).json({ message: 'Devis envoyé', quote: rows[0] });
  } catch (err) { next(err); }
};

const getMyQuotes = async (req, res, next) => {
  try {
    const { role_as='buyer', status } = req.query;
    const field = role_as==='seller' ? 'q.seller_id' : 'q.buyer_id';
    const params = [req.user.id];
    const cond = status ? `AND q.status=$${params.push(status)}` : '';

    const { rows } = await query(`
      SELECT q.*,
        p.title AS product_title, p.slug AS product_slug,
        p.images AS product_images, p.price AS product_price,
        buyer.company_name  AS buyer_company,
        seller.company_name AS seller_company
      FROM quotes q
      JOIN products p ON q.product_id=p.id
      JOIN users buyer  ON q.buyer_id =buyer.id
      JOIN users seller ON q.seller_id=seller.id
      WHERE ${field}=$1 ${cond}
      ORDER BY q.created_at DESC
    `, params);

    res.json({ quotes: rows });
  } catch (err) { next(err); }
};

const respondToQuote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, seller_response, counter_price } = req.body;
    if (!['accepted','rejected'].includes(status))
      return res.status(400).json({ error: 'Statut invalide (accepted|rejected)' });

    const { rows: quotes } = await query('SELECT * FROM quotes WHERE id=$1', [id]);
    if (!quotes.length) return res.status(404).json({ error: 'Devis introuvable' });
    if (quotes[0].seller_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Non autorisé' });

    const { rows } = await query(
      'UPDATE quotes SET status=$1,seller_response=$2,counter_price=$3 WHERE id=$4 RETURNING *',
      [status, seller_response||null, counter_price||null, id]
    );

    query(`INSERT INTO notifications (user_id,type,title,body,data) VALUES ($1,'quote_response',$2,$3,$4)`,
      [quotes[0].buyer_id,
       status==='accepted' ? '✅ Devis accepté !' : '❌ Réponse à votre devis',
       `${req.user.company_name||'Le vendeur'} a ${status==='accepted'?'accepté':'refusé'} votre devis`,
       JSON.stringify({ quote_id: id, status })]
    ).catch(()=>{});

    res.json({ message: 'Réponse enregistrée', quote: rows[0] });
  } catch (err) { next(err); }
};

module.exports.quoteController = { createQuote, getMyQuotes, respondToQuote };
