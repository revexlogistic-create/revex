// routes/transport.js
const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requireTokens } = require('../middleware/tokens');

// ── LISTE retours à vide disponibles ──────────────────────────
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const { departure, arrival, date, my } = req.query;
    const params = ['available'];
    const conds  = ['t.status = $1', 't.departure_date >= CURRENT_DATE'];

    if (departure) conds.push(`t.departure_city ILIKE $${params.push('%'+departure+'%')}`);
    if (arrival)   conds.push(`t.arrival_city   ILIKE $${params.push('%'+arrival+'%')}`);
    if (date)      conds.push(`t.departure_date >= $${params.push(date)}::date`);
    if (my === 'true' && req.user) {
      // Mes trajets — tous statuts
      params.splice(0, params.length);
      conds.length = 0;
      params.push(req.user.id);
      conds.push('t.carrier_id = $1');
    }

    const { rows } = await query(`
      SELECT t.*, u.company_name AS carrier_company, u.phone AS carrier_phone, u.rating AS carrier_rating
      FROM transports t JOIN users u ON t.carrier_id = u.id
      WHERE ${conds.join(' AND ')}
      ORDER BY t.departure_date ASC
      LIMIT 50
    `, params);

    const count = await query(`SELECT COUNT(*) FROM transports t JOIN users u ON t.carrier_id = u.id WHERE ${conds.join(' AND ')}`, params);
    res.json({ transports: rows, total: parseInt(count.rows[0].count) });
  } catch (err) { next(err); }
});

// ── DÉCLARER un retour à vide ─────────────────────────────────
router.post('/', authenticate, requireTokens('publish_transport'), async (req, res, next) => {
  try {
    const { departure_city, departure_region, arrival_city, arrival_region,
            departure_date, vehicle_type, capacity_tons, volume_m3,
            price_per_kg, notes, contact_phone, vehicle_photos=[] } = req.body;
    if (!departure_city || !arrival_city || !departure_date)
      return res.status(400).json({ error: 'Départ, arrivée et date obligatoires' });

    const { rows } = await query(`
      INSERT INTO transports
        (carrier_id, departure_city, departure_region, arrival_city, arrival_region,
         departure_date, vehicle_type, capacity_tons, volume_m3, price_per_kg, notes, contact_phone, vehicle_photos)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [req.user.id, departure_city, departure_region||null, arrival_city,
       arrival_region||null, departure_date, vehicle_type||null,
       capacity_tons||null, volume_m3||null, price_per_kg||null,
       notes||null, contact_phone||null,
       JSON.stringify(Array.isArray(vehicle_photos) ? vehicle_photos : [])]
    );
    res.status(201).json({ transport: rows[0] });
  } catch (err) { next(err); }
});

// ── ANNULER un trajet ─────────────────────────────────────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT carrier_id FROM transports WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error:'Trajet introuvable' });
    if (rows[0].carrier_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error:'Non autorisé' });
    await query("UPDATE transports SET status='cancelled' WHERE id=$1", [req.params.id]);
    res.json({ message:'Trajet annulé' });
  } catch (err) { next(err); }
});

// ── MATCH trajets compatibles (livraison éco) ─────────────────
router.get('/match', optionalAuth, async (req, res, next) => {
  try {
    const { from, to, date } = req.query;
    if (!from || !to) return res.status(400).json({ error:'from et to requis' });

    const params = [`%${from}%`, `%${to}%`];
    const dateClause = date ? `AND t.departure_date >= $${params.push(date)}::date` : '';

    const { rows } = await query(`
      SELECT t.*, u.company_name AS carrier_company, u.phone AS carrier_phone,
        u.rating AS carrier_rating,
        COALESCE(t.capacity_tons,0) AS available_capacity
      FROM transports t JOIN users u ON t.carrier_id = u.id
      WHERE t.status='available' AND t.departure_date >= CURRENT_DATE
        AND t.departure_city ILIKE $1 AND t.arrival_city ILIKE $2
        ${dateClause}
      ORDER BY t.departure_date ASC LIMIT 20
    `, params);

    res.json({ transports: rows, count: rows.length });
  } catch (err) { next(err); }
});

// ── RÉSERVER un trajet (acheteur / vendeur — livraison éco) ───
router.post('/book', authenticate, async (req, res, next) => {
  try {
    const { transport_id, pickup_city, delivery_city, weight_kg, notes } = req.body;
    if (!transport_id) return res.status(400).json({ error:'transport_id requis' });

    const { rows: transports } = await query(
      "SELECT * FROM transports WHERE id=$1 AND status='available'",
      [transport_id]
    );
    if (!transports.length) return res.status(404).json({ error:'Trajet indisponible' });
    const t = transports[0];

    if (t.carrier_id === req.user.id)
      return res.status(400).json({ error:'Vous ne pouvez pas réserver votre propre trajet' });

    const bookingPrice = t.price_per_kg ? Math.round(Number(t.price_per_kg) * Number(weight_kg || 50)) : 0;

    // Créer la réservation (sans order_id obligatoire)
    const { rows: booking } = await query(`
      INSERT INTO transport_bookings
        (transport_id, carrier_id, buyer_id, seller_id,
         pickup_city, delivery_city, booking_price, notes, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending') RETURNING *`,
      [transport_id, t.carrier_id, req.user.id, t.carrier_id,
       pickup_city || t.departure_city, delivery_city || t.arrival_city,
       bookingPrice, notes||null]
    );

    // Notifier le transporteur
    query(`INSERT INTO notifications (user_id,type,title,body,data) VALUES ($1,'transport_booking','📦 Nouvelle réservation !',$2,$3)`,
      [t.carrier_id,
       req.user.company_name + ' souhaite utiliser votre trajet ' + t.departure_city + ' → ' + t.arrival_city,
       JSON.stringify({ booking_id: booking[0].id, transport_id })]
    ).catch(() => {});

    res.status(201).json({
      message: 'Réservation envoyée ! Le transporteur confirmera sous 24h.',
      booking: booking[0],
      estimated_price: bookingPrice
    });
  } catch (err) { next(err); }
});

// ── MES RÉSERVATIONS ──────────────────────────────────────────
router.get('/bookings', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT tb.*,
        t.departure_city, t.arrival_city, t.departure_date, t.vehicle_type,
        carrier.company_name AS carrier_company, carrier.phone AS carrier_phone,
        requester.company_name AS buyer_company
      FROM transport_bookings tb
      JOIN transports t ON tb.transport_id = t.id
      JOIN users carrier   ON tb.carrier_id = carrier.id
      JOIN users requester ON tb.buyer_id = requester.id
      WHERE tb.carrier_id=$1 OR tb.buyer_id=$1
      ORDER BY tb.created_at DESC
    `, [req.user.id]);

    res.json({ bookings: rows });
  } catch (err) { next(err); }
});

// ── CONFIRMER une réservation (transporteur) ──────────────────
router.put('/bookings/:id/confirm', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM transport_bookings WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error:'Réservation introuvable' });
    if (rows[0].carrier_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ error:'Seul le transporteur peut confirmer' });

    await query("UPDATE transport_bookings SET status='confirmed', confirmed_at=NOW() WHERE id=$1", [req.params.id]);

    query(`INSERT INTO notifications (user_id,type,title,body) VALUES ($1,'transport_confirmed','✅ Trajet confirmé !',$2)`,
      [rows[0].buyer_id, 'Votre réservation de transport a été confirmée par le transporteur.']
    ).catch(() => {});

    res.json({ message:'Réservation confirmée !' });
  } catch (err) { next(err); }
});

module.exports = router;
