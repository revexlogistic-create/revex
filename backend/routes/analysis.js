// routes/analysis.js — Analyse stock dormant + Trust Score + Escrow + Litiges + Certificats
const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { requireTokens } = require('../middleware/tokens');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// ── ANALYSE STOCK — MÉTHODE CCOM (Processus linéaire MANSOUR AMINE) ──────────
// Seuil stock dormant : AGE >= 36 mois (3 ans)
// Formule : CCOM_SCORE = (Criticité×0.4) + (Consommation×0.3) + (Valeur×0.2) + (Obsolescence×0.1)

// ── Étape 3 : Calcul des KPI opérationnels ────────────────────
function calculerKPI(article) {
  const now = new Date();
  const derniereSortie = article.derniere_sortie ? new Date(article.derniere_sortie) : null;
  const age_mois = derniereSortie
    ? Math.floor((now - derniereSortie) / (1000 * 60 * 60 * 24 * 30))
    : 999; // jamais sorti = très ancien

  const freq          = article.sorties_12mois || 0;
  const conso_annuelle= article.conso_annuelle || 0;
  const stock_moyen   = article.stock_moyen || article.quantite || 1;
  const rotation      = conso_annuelle > 0 ? (conso_annuelle / stock_moyen) : 0;
  const couverture    = conso_annuelle > 0 ? ((article.quantite || 1) / (conso_annuelle / 12)) : 999;

  return { age_mois, freq, rotation, couverture };
}

// ── Étape 4 : Score Criticité (C) ─────────────────────────────
function scoreCriticite(article) {
  const c = (article.criticite || '').toLowerCase();
  if (c === 'critique' || c === 'critical')       return 100;
  if (c === 'important' || c === 'majeur')         return 60;
  return 20; // non critique par défaut
}

// ── Étape 5 : Score Consommation (C) ──────────────────────────
function scoreConsommation(kpi) {
  if (kpi.freq === 0 && kpi.rotation === 0) return 0;   // aucune consommation
  if (kpi.freq <= 1 || kpi.rotation < 0.5)  return 30;  // faible
  if (kpi.freq <= 4 || kpi.rotation < 2)    return 60;  // moyenne
  return 100;                                            // élevée
}

// ── Étape 6 : Score Valeur/ABC (V) ────────────────────────────
function scoreValeur(article, valeurMax) {
  const val = (article.prix || 0) * (article.quantite || 1);
  const pct = valeurMax > 0 ? val / valeurMax : 0;
  if (pct >= 0.20) return 100; // Classe A
  if (pct >= 0.05) return 60;  // Classe B
  return 20;                   // Classe C
}

// ── Étape 7 : Score Obsolescence (O) ──────────────────────────
function scoreObsolescence(article) {
  const o = (article.obsolescence || '').toLowerCase();
  if (o === 'obsolete' || o === 'obsolète') return 0;
  if (o === 'risque' || o === 'risk')       return 40;
  return 100; // OK par défaut
}

// ── Étape 8 : Score Global CCOM ───────────────────────────────
function calculerCCOM(scorC, scorConso, scorV, scorO) {
  return Math.round((scorC * 0.4) + (scorConso * 0.3) + (scorV * 0.2) + (scorO * 0.1));
}

// ── Étape 11 : Classification finale CCOM ────────────────────
function classifierCCOM(score) {
  if (score > 75) return { classe: 'actif_strategique',  label: 'Stock actif stratégique', color: '#27AE60', action: 'maintien' };
  if (score > 50) return { classe: 'utile',              label: 'Stock utile',              color: '#2980B9', action: 'optimisation' };
  if (score > 25) return { classe: 'lent',               label: 'Stock lent',               color: '#E67E22', action: 'reduction' };
  return           { classe: 'dormant_critique',          label: 'Stock dormant critique',   color: '#C0392B', action: 'liquidation' };
}

// ── Étape 12 : Décision opérationnelle ────────────────────────
function decisionOperationnelle(classe, estStrategique) {
  if (estStrategique) return '🔒 Maintien et sécurisation';
  const map = {
    actif_strategique: '🔒 Maintien et sécurisation',
    utile:             '📉 Optimisation du niveau',
    lent:              '⬇️ Réduction progressive',
    dormant_critique:  '🏪 Vente sur marketplace REVEX',
  };
  return map[classe] || '🏪 Vente sur marketplace REVEX';
}

// ── DONNÉES DÉMO réalistes (seuil 36 mois) ────────────────────
const DEMO_DATA = [
  { reference:'90004645', name:'CHAUSSURE DE SECURITE GENERALE',     quantite:13, prix:598,       derniere_sortie:'2019-12-31', sorties_12mois:0, conso_annuelle:0, criticite:'non critique', obsolescence:'OK'      },
  { reference:'80074174', name:'MOBILE D AGITATION',                  quantite:1,  prix:1024307,   derniere_sortie:'2016-05-09', sorties_12mois:0, conso_annuelle:0, criticite:'critique',     obsolescence:'risque'  },
  { reference:'80142580', name:'ELIMINATEUR DE BRUMES ES 212',        quantite:18, prix:33187,     derniere_sortie:'2019-01-21', sorties_12mois:0, conso_annuelle:0, criticite:'important',    obsolescence:'OK'      },
  { reference:'90004842', name:'LUNETTE A BRANCHES INCOLORE',         quantite:32, prix:10,        derniere_sortie:'2016-08-09', sorties_12mois:0, conso_annuelle:0, criticite:'non critique', obsolescence:'OK'      },
  { reference:'80156302', name:'POMPE DOSEUSE STELIO A 1030',         quantite:2,  prix:45200,     derniere_sortie:'2020-03-15', sorties_12mois:0, conso_annuelle:0, criticite:'critique',     obsolescence:'OK'      },
  { reference:'80198745', name:'MOTEUR ELECTRIQUE 15KW 380V',         quantite:3,  prix:18500,     derniere_sortie:'2021-06-01', sorties_12mois:2, conso_annuelle:2, criticite:'critique',     obsolescence:'OK'      },
  { reference:'80223341', name:'VARIATEUR ABB ACS880 75KW',           quantite:1,  prix:78000,     derniere_sortie:'2022-09-01', sorties_12mois:1, conso_annuelle:1, criticite:'important',    obsolescence:'OK'      },
  { reference:'90008821', name:'FILTRE A HUILE HYDRAULIQUE',          quantite:45, prix:320,       derniere_sortie:'2021-11-10', sorties_12mois:8, conso_annuelle:12, criticite:'important',   obsolescence:'OK'      },
  { reference:'80301122', name:'VANNE PAPILLON PNEUMATIQUE DN150',    quantite:3,  prix:8900,      derniere_sortie:'2021-06-30', sorties_12mois:0, conso_annuelle:0, criticite:'non critique', obsolescence:'OK'      },
  { reference:'80412233', name:'ROULEMENT SKF 6210 (LOT 24)',         quantite:24, prix:185,       derniere_sortie:'2022-01-15', sorties_12mois:4, conso_annuelle:6, criticite:'non critique', obsolescence:'OK'      },
  { reference:'80501144', name:'COMPRESSEUR A VIS ATLAS GA15',        quantite:1,  prix:55000,     derniere_sortie:'2023-07-01', sorties_12mois:0, conso_annuelle:0, criticite:'critique',     obsolescence:'OK'      },
  { reference:'90112233', name:'JOINT TORIQUE NBR 50X4 (LOT 100)',    quantite:8,  prix:45,        derniere_sortie:'2019-04-22', sorties_12mois:0, conso_annuelle:0, criticite:'non critique', obsolescence:'obsolète'},
  { reference:'80654321', name:'AUTOMATE SCHNEIDER M340 COMPLET',     quantite:1,  prix:45000,     derniere_sortie:'2023-01-01', sorties_12mois:0, conso_annuelle:0, criticite:'important',    obsolescence:'OK'      },
  { reference:'80789012', name:'TRANSFORMATEUR 400/230V 50KVA',       quantite:2,  prix:32000,     derniere_sortie:'2018-07-18', sorties_12mois:0, conso_annuelle:0, criticite:'critique',     obsolescence:'risque'  },
  { reference:'90234567', name:'TUYAU FLEXIBLE HYDRAULIQUE DN25',     quantite:12, prix:850,       derniere_sortie:'2020-09-05', sorties_12mois:0, conso_annuelle:0, criticite:'non critique', obsolescence:'OK'      },
];

router.post('/stock', authenticate, async (req, res, next) => {
  try {
    const { plan = 'free', filename, items } = req.body;
    console.log('[analysis/stock] plan:', plan, 'items:', items?.length || 0, 'user:', req.user?.id);

    // Utiliser les données reçues OU la démo
    const articles = (items && Array.isArray(items) && items.length > 0) ? items : DEMO_DATA;
    const SEUIL_DORMANT_MOIS = 36; // ← 3 ans selon le document

    // ── Étape 2 : Fiabilisation (nettoyage) ──────────────────
    // Normaliser les champs — accepter designation/description comme name
    const normalized = articles.map(a => ({
      ...a,
      name: a.name || a.designation || a.description || a.libelle || a.reference || 'Article',
      reference: a.reference || a.code || a.code_article || ('REF-' + Math.random().toString(36).slice(2,7)),
      prix: Number(a.prix || a.price || a.pu || a.valeur_unitaire || 0),
      quantite: Number(a.quantite || a.qty || a.quantity || a.stock || 1),
    }));

    const articlesValides = normalized.filter(a =>
      a.reference && a.name && (a.prix || 0) >= 0
    );

    if (articlesValides.length === 0) {
      return res.status(400).json({
        error: 'Aucun article valide dans le fichier. Vérifiez que les colonnes "reference" (ou "code") et "name" (ou "designation") sont présentes.'
      });
    }

    // Valeur max pour classification ABC (étape 6) — protégé contre tableau vide
    const valeurMax = articlesValides.reduce((max, a) => Math.max(max, (a.prix||0)*(a.quantite||1)), 0) || 1;

    // ── Étapes 3 à 11 : Calcul CCOM pour chaque article ─────
    const resultats = articlesValides.map(article => { // article already normalized
      // Étape 3 : KPI
      const kpi = calculerKPI(article);

      // Étapes 4-7 : Dimensions CCOM
      const scorC    = scoreCriticite(article);
      const scorCons = scoreConsommation(kpi);
      const scorV    = scoreValeur(article, valeurMax);
      const scorO    = scoreObsolescence(article);

      // Étape 8 : Score global
      const ccom_score = calculerCCOM(scorC, scorCons, scorV, scorO);

      // Étape 9 : Stock stratégique (criticité ≥ 80) → exclu du dormant
      const est_strategique = scorC >= 80;

      // Étape 10 : Identification stock dormant (seuil 36 mois)
      const est_dormant = !est_strategique
        && kpi.age_mois >= SEUIL_DORMANT_MOIS
        && scorCons <= 30;

      // Étape 11 : Classification finale
      const classification = classifierCCOM(ccom_score);

      // Étape 12 : Décision
      const decision = decisionOperationnelle(classification.classe, est_strategique);

      const valeur_totale = (article.prix || 0) * (article.quantite || 1);

      return {
        reference:       article.reference,
        name:            article.name,
        quantite:        article.quantite || 1,
        prix_unitaire:   article.prix || 0,
        valeur_totale,
        age_mois:        kpi.age_mois,
        dormant_ans:     (kpi.age_mois / 12).toFixed(1),
        // Dimensions CCOM
        score_criticite:    scorC,
        score_consommation: scorCons,
        score_valeur:       scorV,
        score_obsolescence: scorO,
        ccom_score,
        // Classification
        classe:          classification.classe,
        classe_label:    classification.label,
        classe_color:    classification.color,
        est_strategique,
        est_dormant,
        decision,
        // Grade qualité REVEX
        grade: article.condition === 'used' ? 'C' : article.condition === 'good' ? 'B' : 'A',
      };
    });

    // ── Étape 11 : Segmentation finale ───────────────────────
    const stock_strategique  = resultats.filter(r => r.est_strategique);
    const stock_dormant      = resultats.filter(r => r.est_dormant);
    const stock_utile        = resultats.filter(r => r.classe === 'utile' && !r.est_strategique);
    const stock_lent         = resultats.filter(r => r.classe === 'lent' && !r.est_strategique);
    const stock_obsolete     = resultats.filter(r => r.score_obsolescence === 0);

    // Capital total valorisable (dormant non stratégique)
    const valeur_dormant = stock_dormant.reduce((s, r) => s + r.valeur_totale, 0);
    const valeur_totale  = resultats.reduce((s, r) => s + r.valeur_totale, 0);

    const result = {
      // Méta
      methode:           'CCOM',
      seuil_dormant_mois: SEUIL_DORMANT_MOIS,
      date_analyse:      new Date().toISOString(),

      // Étape 3 : Statistiques globales
      total_refs:        resultats.length,
      valeur_totale,

      // Étape 10 : Stock dormant
      dormant_count:     stock_dormant.length,
      dormant_value:     valeur_dormant,
      dormant_percentage: ((stock_dormant.length / resultats.length) * 100).toFixed(1),

      // Étape 11 : Segmentation CCOM
      segmentation: {
        actif_strategique: stock_strategique.length,
        utile:             stock_utile.length,
        lent:              stock_lent.length,
        dormant_critique:  stock_dormant.filter(r => r.classe === 'dormant_critique').length,
        obsolete:          stock_obsolete.length,
      },

      // Listes détaillées
      dormant_items:    stock_dormant.sort((a, b) => b.valeur_totale - a.valeur_totale),
      strategique_items: stock_strategique,
      lent_items:       stock_lent,
      tous_articles:    resultats,

      // Étape 15 : Indicateurs de performance
      kpis: {
        taux_dormant:       ((stock_dormant.length / resultats.length) * 100).toFixed(1) + '%',
        valeur_immobilisee: valeur_dormant,
        taux_obsolescence:  ((stock_obsolete.length / resultats.length) * 100).toFixed(1) + '%',
        gain_potentiel:     Math.round(valeur_dormant * 0.65), // estimation 65% recouvrable
      },
    };

    // Sauvegarder en base (non bloquant si la table n'existe pas encore)
    let savedAnalysis = null;
    try {
      const { rows } = await query(
        'INSERT INTO stock_analyses (company_id, filename, plan, status, total_refs, dormant_count, dormant_value, dormant_percentage, analysis_result, completed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) RETURNING *',
        [req.user.id, filename || 'analyse_ccom.xlsx', plan, 'completed',
         result.total_refs, result.dormant_count, result.dormant_value,
         result.dormant_percentage, JSON.stringify(result)]
      );
      savedAnalysis = rows[0];
    } catch (saveErr) {
      // Table peut ne pas exister encore — on renvoie quand même le résultat
      console.warn('[analysis] Save skipped:', saveErr.message);
    }

    res.json({ analysis: savedAnalysis, result });
  } catch (err) {
    console.error('[analysis/stock] FULL ERROR:', err);
    res.status(500).json({ error: 'Erreur analyse : ' + err.message });
  }
});

// GET mes analyses
router.get('/stock', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM stock_analyses WHERE company_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ analyses: rows });
  } catch (err) { next(err); }
});

// ── ESCROW ────────────────────────────────────────────────────
// Créer une transaction escrow à la commande
router.post('/escrow', authenticate, async (req, res, next) => {
  try {
    const { order_id, payment_method = 'simulated' } = req.body;
    const { rows: orders } = await query('SELECT * FROM orders WHERE id = $1 AND buyer_id = $2', [order_id, req.user.id]);
    if (!orders.length) return res.status(404).json({ error: 'Commande introuvable' });

    const ref = `ESC-${Date.now()}`;
    const { rows } = await query(
      `INSERT INTO escrow_transactions (order_id, amount, currency, status, payment_ref, payment_method)
       VALUES ($1,$2,'MAD','held',$3,$4) RETURNING *`,
      [order_id, orders[0].final_price, ref, payment_method]
    );

    // Confirmer la commande
    await query("UPDATE orders SET status = 'confirmed', payment_status = 'escrowed', payment_ref = $1, confirmed_at = NOW() WHERE id = $2", [ref, order_id]);

    // Notifier le vendeur
    await query(
      `INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1, 'payment_escrowed', 'Paiement sécurisé reçu', $2, $3)`,
      [orders[0].seller_id, `Paiement de ${orders[0].final_price} MAD sécurisé pour commande ${orders[0].order_number}`, JSON.stringify({ escrow_id: rows[0].id, order_id })]
    );

    res.json({ escrow: rows[0], message: 'Paiement sécurisé en escrow' });
  } catch (err) { next(err); }
});

// Libérer l'escrow (acheteur confirme réception)
router.post('/escrow/:id/release', authenticate, async (req, res, next) => {
  try {
    const { rows: escrows } = await query(
      'SELECT e.*, o.buyer_id, o.seller_id FROM escrow_transactions e JOIN orders o ON e.order_id = o.id WHERE e.id = $1',
      [req.params.id]
    );
    if (!escrows.length) return res.status(404).json({ error: 'Transaction escrow introuvable' });
    const escrow = escrows[0];

    if (escrow.buyer_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Non autorisé' });
    if (escrow.status !== 'held') return res.status(400).json({ error: `Escrow déjà ${escrow.status}` });

    await query("UPDATE escrow_transactions SET status = 'released', released_at = NOW(), release_trigger = $1 WHERE id = $2", ['buyer_confirmed', req.params.id]);
    await query("UPDATE orders SET status = 'delivered', delivered_at = NOW(), payment_status = 'paid' WHERE id = $1", [escrow.order_id]);
    await query('UPDATE users SET total_sales = total_sales + 1 WHERE id = $1', [escrow.seller_id]);
    await query('UPDATE users SET total_purchases = total_purchases + 1 WHERE id = $1', [escrow.buyer_id]);

    await query(`INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1, 'payment_released', '💰 Paiement libéré !', $2, $3)`,
      [escrow.seller_id, `Votre paiement de ${escrow.amount} MAD a été libéré`, JSON.stringify({ escrow_id: req.params.id })]);

    res.json({ message: 'Paiement libéré au vendeur avec succès' });
  } catch (err) { next(err); }
});

// ── LITIGES ───────────────────────────────────────────────────
router.post('/disputes', authenticate, async (req, res, next) => {
  try {
    const { order_id, reason, description, evidence_urls } = req.body;
    const { rows: orders } = await query('SELECT * FROM orders WHERE id = $1 AND (buyer_id = $2 OR seller_id = $2)', [order_id, req.user.id]);
    if (!orders.length) return res.status(404).json({ error: 'Commande introuvable' });
    const order = orders[0];

    // Récupérer l'escrow lié
    const { rows: escrows } = await query('SELECT id FROM escrow_transactions WHERE order_id = $1 AND status = $2', [order_id, 'held']);

    const { rows } = await query(
      `INSERT INTO disputes (order_id, escrow_id, opened_by, seller_id, buyer_id, reason, description, evidence_urls)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [order_id, escrows[0]?.id || null, req.user.id, order.seller_id, order.buyer_id, reason, description, JSON.stringify(evidence_urls || [])]
    );

    // Geler l'escrow si existant
    if (escrows[0]) await query("UPDATE escrow_transactions SET status = 'disputed' WHERE id = $1", [escrows[0].id]);
    await query("UPDATE orders SET status = 'refunded' WHERE id = $1", [order_id]); // en attente

    // Notifier admin
    await query(`INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1, 'new_dispute', '⚠️ Nouveau litige ouvert', $2, $3)`,
      ['00000000-0000-0000-0000-000000000001', `Litige ouvert sur commande ${order.order_number}`, JSON.stringify({ dispute_id: rows[0].id })]);

    res.status(201).json({ dispute: rows[0], message: 'Litige ouvert. Notre équipe vous contactera sous 24h.' });
  } catch (err) { next(err); }
});

router.get('/disputes', authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const { rows } = await query(
      `SELECT d.*, o.order_number, p.title AS product_title,
         b.company_name AS buyer_company, s.company_name AS seller_company
       FROM disputes d
       JOIN orders o ON d.order_id = o.id
       JOIN products p ON o.product_id = p.id
       JOIN users b ON d.buyer_id = b.id
       JOIN users s ON d.seller_id = s.id
       WHERE ${isAdmin ? 'TRUE' : '(d.buyer_id = $1 OR d.seller_id = $1)'}
       ORDER BY d.created_at DESC`,
      isAdmin ? [] : [req.user.id]
    );
    res.json({ disputes: rows });
  } catch (err) { next(err); }
});

// ── CERTIFICATS DE TRAÇABILITÉ ────────────────────────────────
router.post('/certificates', authenticate, authorize('seller', 'admin'), async (req, res, next) => {
  try {
    const { product_id, order_id, manufacturing_year, original_manufacturer, usage_history, last_maintenance_date, inspector_name } = req.body;

    const { rows: products } = await query('SELECT * FROM products WHERE id = $1', [product_id]);
    if (!products.length) return res.status(404).json({ error: 'Produit introuvable' });
    const product = products[0];
    if (product.seller_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Non autorisé' });

    const year = new Date().getFullYear();
    const seq = Math.floor(Math.random() * 90000) + 10000;
    const certRef = `REVEX-CERT-${year}-${seq}`;
    const hash = crypto.createHash('sha256').update(`${certRef}-${product_id}-${Date.now()}`).digest('hex');

    const { rows: orders } = order_id ? await query('SELECT buyer_id FROM orders WHERE id = $1', [order_id]) : { rows: [{ buyer_id: null }] };

    const { rows } = await query(
      `INSERT INTO traceability_certificates
        (certificate_ref, product_id, order_id, seller_id, buyer_id, product_title, product_reference, quality_grade, condition, quantity, inspection_date, inspector_name, manufacturing_year, original_manufacturer, usage_history, last_maintenance_date, verification_hash, revex_validated, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11,$12,$13,$14,$15,$16,TRUE,NOW() + INTERVAL '3 years') RETURNING *`,
      [certRef, product_id, order_id || null, req.user.id, orders[0]?.buyer_id || null,
       product.title, product.reference, product.quality_grade, product.condition, product.quantity,
       inspector_name || req.user.contact_name, manufacturing_year || null, original_manufacturer || product.brand || null,
       usage_history || null, last_maintenance_date || null, hash]
    );

    // Marquer le produit comme certifié
    await query('UPDATE products SET revex_certified = TRUE, certification_ref = $1, certification_date = NOW() WHERE id = $2', [certRef, product_id]);

    res.status(201).json({ certificate: rows[0], message: `Certificat ${certRef} émis avec succès` });
  } catch (err) { next(err); }
});

// Vérifier un certificat par son hash (public)
router.get('/certificates/verify/:hash', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.*, s.company_name AS seller_company, s.city AS seller_city
       FROM traceability_certificates c JOIN users s ON c.seller_id = s.id
       WHERE c.verification_hash = $1`,
      [req.params.hash]
    );
    if (!rows.length) return res.status(404).json({ valid: false, error: 'Certificat introuvable ou invalide' });
    const cert = rows[0];
    res.json({ valid: cert.is_valid, certificate: cert });
  } catch (err) { next(err); }
});

// ── QUALIFICATION VENDEUR ─────────────────────────────────────
router.post('/seller-qualification', authenticate, authorize('seller', 'admin'), async (req, res, next) => {
  try {
    const { rc_document_url, ice_document_url, identity_document_url, stock_classification, stock_criticality, stock_rotation, compliance_signed, quality_signed } = req.body;

    const existing = await query('SELECT id FROM seller_qualifications WHERE seller_id = $1', [req.user.id]);
    let rows;

    if (existing.rows.length) {
      ({ rows } = await query(
        `UPDATE seller_qualifications SET rc_document_url=$1, ice_document_url=$2, identity_document_url=$3, stock_classification=$4, stock_criticality=$5, stock_rotation=$6, compliance_signed=$7, quality_signed=$8, signed_at=NOW(), status='in_review' WHERE seller_id=$9 RETURNING *`,
        [rc_document_url || null, ice_document_url || null, identity_document_url || null, stock_classification || null, stock_criticality || null, stock_rotation || null, compliance_signed || false, quality_signed || false, req.user.id]
      ));
    } else {
      ({ rows } = await query(
        `INSERT INTO seller_qualifications (seller_id, rc_document_url, ice_document_url, identity_document_url, stock_classification, stock_criticality, stock_rotation, compliance_signed, quality_signed, signed_at, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),'in_review') RETURNING *`,
        [req.user.id, rc_document_url || null, ice_document_url || null, identity_document_url || null, stock_classification || null, stock_criticality || null, stock_rotation || null, compliance_signed || false, quality_signed || false]
      ));
    }

    // Notifier admin
    await query(`INSERT INTO notifications (user_id, type, title, body) VALUES ($1,'seller_qualification','📋 Nouvelle demande de qualification',$2)`,
      ['00000000-0000-0000-0000-000000000001', `${req.user.company_name} a soumis sa qualification vendeur`]);

    res.json({ qualification: rows[0], message: 'Dossier soumis. Vérification sous 48h.' });
  } catch (err) { next(err); }
});

// GET ma qualification
router.get('/seller-qualification', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM seller_qualifications WHERE seller_id = $1', [req.user.id]);
    res.json({ qualification: rows[0] || null });
  } catch (err) { next(err); }
});

// ── DEMANDE URGENTE ───────────────────────────────────────────
router.post('/urgent', authenticate, async (req, res, next) => {
  try {
    const {
      part_reference, part_description, equipment_model, urgency_level,
      max_delivery_hours, max_budget, location_city, location_region,
      quantity, unit, notes, accept_alternative, contact_phone, sector, equipment_brand
    } = req.body;

    if (!part_description) return res.status(400).json({ error: 'La description de la pièce est obligatoire' });

    // 1. Enregistrer la demande
    const { rows } = await query(
      'INSERT INTO urgent_requests (buyer_id, part_reference, part_description, equipment_model, urgency_level, max_delivery_hours, max_budget, location_city, location_region) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [req.user.id, part_reference || null, part_description, equipment_model || null,
       urgency_level || 'high', max_delivery_hours || 48, max_budget || null,
       location_city || null, location_region || null]
    );
    const request = rows[0];
    const buyerCompany = req.user.company_name || req.user.email;
    const urgLabel = urgency_level === 'critical' ? 'CRITIQUE' : urgency_level === 'high' ? 'HAUTE' : 'MOYENNE';

    const notifTitle = '[URGENT ' + urgLabel + '] Demande PDR — ' + part_description.substring(0, 60);
    const notifBody  = buyerCompany + ' cherche : ' + part_description
      + (part_reference ? ' [Réf: ' + part_reference + ']' : '')
      + (location_city  ? ' · Livraison à : ' + location_city : '')
      + ' · Délai max : ' + (max_delivery_hours || 48) + 'h'
      + (max_budget     ? ' · Budget : ' + Number(max_budget).toLocaleString('fr-MA') + ' MAD' : '');
    const notifData  = JSON.stringify({ urgent_request_id: request.id, urgency_level, part_reference, location_city });

    // 2. Notifier TOUS les vendeurs actifs
    const sellers = await query(
      "SELECT id FROM users WHERE role IN ('seller','distributor') AND status = 'active'"
    );
    for (const seller of sellers.rows) {
      query(
        'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1,$2,$3,$4,$5)',
        [seller.id, 'urgent_request', notifTitle, notifBody, notifData]
      ).catch(() => {});
    }

    // 3. Notifier TOUS les admins
    const admins = await query("SELECT id FROM users WHERE role = 'admin'");
    for (const admin of admins.rows) {
      query(
        'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1,$2,$3,$4,$5)',
        [admin.id, 'urgent_request_admin', '[ADMIN] ' + notifTitle, buyerCompany + ' a soumis une demande urgente. ' + notifBody, notifData]
      ).catch(() => {});
    }

    // 4. Notifier l'acheteur lui-même (confirmation)
    query(
      'INSERT INTO notifications (user_id, type, title, message) VALUES ($1,$2,$3,$4)',
      [req.user.id, 'urgent_sent', '✅ Demande urgente envoyée', 'Votre demande a été diffusée à ' + sellers.rows.length + ' vendeur(s) et ' + admins.rows.length + ' admin(s).']
    ).catch(() => {});

    console.log('[urgent] Diffusé à', sellers.rows.length, 'vendeurs +', admins.rows.length, 'admins — Ref:', part_reference || '—');

    // 5. Chercher produits correspondants (élargi)
    const searchTerm = part_reference
      ? '%' + part_reference + '%'
      : '%' + part_description.split(' ').slice(0, 3).join('%') + '%';

    const matches = await query(
      'SELECT p.id, p.title, p.price, p.urgent_delivery_price, p.delivery_days_urgent, p.slug, p.reference, u.company_name, u.id AS seller_id FROM products p JOIN users u ON p.seller_id = u.id WHERE p.status = $1 AND (p.title ILIKE $2 OR p.reference ILIKE $2 OR p.description ILIKE $2) ORDER BY p.urgent_mode DESC, p.urgent_delivery_price ASC LIMIT 8',
      ['active', searchTerm]
    );

    res.status(201).json({
      request,
      matches: matches.rows,
      notified: { sellers: sellers.rows.length, admins: admins.rows.length },
      message: 'Demande diffusée à ' + sellers.rows.length + ' vendeur(s) et ' + admins.rows.length + ' admin(s).'
    });
  } catch (err) {
    console.error('[urgent POST] Error:', err.message);
    next(err);
  }
});

router.get('/urgent', authenticate, async (req, res, next) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const field = isAdmin ? 'TRUE' : 'ur.buyer_id = $1';
    const params = isAdmin ? [] : [req.user.id];
    const { rows } = await query(
      `SELECT ur.*, u.company_name AS buyer_company FROM urgent_requests ur JOIN users u ON ur.buyer_id = u.id WHERE ${field} AND ur.expires_at > NOW() ORDER BY ur.created_at DESC`,
      params
    );
    res.json({ requests: rows });
  } catch (err) { next(err); }
});


// ── RÉPONSE VENDEUR à une demande urgente ─────────────────────
router.post('/urgent/:id/respond', authenticate, async (req, res, next) => {
  try {
    if (!['seller','distributor','admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Vendeurs uniquement' });
    }
    const { proposed_price, delivery_hours, message, quantity_available, product_id } = req.body;

    // Vérifier que la demande existe et n'est pas expirée
    const { rows: reqRows } = await query(
      'SELECT * FROM urgent_requests WHERE id=$1 AND expires_at > NOW()',
      [req.params.id]
    );
    if (!reqRows.length) return res.status(404).json({ error: 'Demande introuvable ou expirée' });
    const urgReq = reqRows[0];

    // Vérifier pas déjà répondu par ce vendeur
    const { rows: existing } = await query(
      'SELECT id FROM urgent_responses WHERE request_id=$1 AND seller_id=$2',
      [req.params.id, req.user.id]
    );
    if (existing.length) {
      // Update existing response
      await query(
        'UPDATE urgent_responses SET proposed_price=$1, delivery_hours=$2, message=$3, quantity_available=$4, product_id=$5, status=$6 WHERE id=$7',
        [proposed_price||null, delivery_hours||null, message||null, quantity_available||1, product_id||null, 'pending', existing[0].id]
      );
    } else {
      // Create new response
      await query(
        'INSERT INTO urgent_responses (request_id, seller_id, product_id, seller_company, seller_phone, seller_city, message, proposed_price, delivery_hours, quantity_available) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [req.params.id, req.user.id, product_id||null,
         req.user.company_name, req.user.phone||null, req.user.city||null,
         message||null, proposed_price||null, delivery_hours||null, quantity_available||1]
      );
    }

    // Mettre à jour le statut de la demande → matched
    await query(
      "UPDATE urgent_requests SET status='matched' WHERE id=$1 AND status='open'",
      [req.params.id]
    );

    // Notifier l'acheteur
    const sellerName = req.user.company_name || 'Un vendeur';
    const notifMsg = sellerName + ' peut fournir votre pièce'
      + (proposed_price ? ' à ' + Number(proposed_price).toLocaleString('fr-MA') + ' MAD' : '')
      + (delivery_hours ? ' en ' + delivery_hours + 'h' : '') + '.';

    await query(
      'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1,$2,$3,$4,$5)',
      [urgReq.buyer_id, 'urgent_response',
       '⚡ Réponse à votre demande urgente !',
       notifMsg,
       JSON.stringify({ request_id: req.params.id, seller_id: req.user.id })]
    ).catch(() => {});

    res.json({ message: 'Reponse envoyee. Acheteur notifie immediatement.' });
  } catch (err) { console.error('[urgent respond]', err.message); next(err); }
});

// ── ACHETEUR : voir les réponses pour ses demandes ─────────────
router.get('/urgent/:id/responses', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT ur.*, u.company_name AS seller_name, u.phone AS seller_phone_user, u.city AS seller_city_user, u.seller_rating, p.title AS product_title, p.slug AS product_slug, p.images AS product_images FROM urgent_responses ur JOIN users u ON ur.seller_id = u.id LEFT JOIN products p ON p.id = ur.product_id WHERE ur.request_id=$1 ORDER BY ur.created_at DESC',
      [req.params.id]
    );
    res.json({ responses: rows });
  } catch (err) { next(err); }
});

// ── ACHETEUR : accepter une réponse → crée une commande ────────
router.post('/urgent/:id/accept/:responseId', authenticate, async (req, res, next) => {
  try {
    const { rows: respRows } = await query(
      'SELECT ur.*, ureq.buyer_id, ureq.part_description FROM urgent_responses ur JOIN urgent_requests ureq ON ur.request_id = ureq.id WHERE ur.id=$1 AND ureq.buyer_id=$2',
      [req.params.responseId, req.user.id]
    );
    if (!respRows.length) return res.status(404).json({ error: 'Réponse introuvable' });
    const resp = respRows[0];

    let orderId = null;
    // Si un produit est lié → créer une commande directe
    if (resp.product_id) {
      const { rows: orderRows } = await query(
        'INSERT INTO orders (buyer_id, seller_id, product_id, quantity, unit_price, final_price, delivery_mode, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, order_number',
        [req.user.id, resp.seller_id, resp.product_id, 1,
         resp.proposed_price, resp.proposed_price,
         'urgent', 'Commande urgente — ' + (resp.part_description||'').substring(0,80)]
      );
      orderId = orderRows[0]?.id;
    }

    // Marquer réponse comme acceptée
    await query("UPDATE urgent_responses SET status='accepted' WHERE id=$1", [resp.id]);
    // Marquer les autres réponses comme rejetées
    await query("UPDATE urgent_responses SET status='rejected' WHERE request_id=$1 AND id!=$2", [req.params.id, resp.id]);
    // Marquer la demande comme fulfillée
    await query("UPDATE urgent_requests SET status='fulfilled' WHERE id=$1", [req.params.id]);

    // Notifier le vendeur
    await query(
      'INSERT INTO notifications (user_id, type, title, message, data) VALUES ($1,$2,$3,$4,$5)',
      [resp.seller_id, 'urgent_accepted',
       '✅ Votre réponse urgente a été acceptée !',
       req.user.company_name + ' a accepté votre offre' + (resp.proposed_price ? ' de ' + Number(resp.proposed_price).toLocaleString('fr-MA') + ' MAD' : '') + '.',
       JSON.stringify({ request_id: req.params.id, order_id: orderId })]
    ).catch(() => {});

    res.json({
      message: 'Réponse acceptée' + (orderId ? ' — commande créée' : ' — le vendeur va vous contacter'),
      order_id: orderId,
    });
  } catch (err) { console.error('[urgent accept]', err.message); next(err); }
});

// ── VENDEUR : voir toutes les demandes urgentes ouvertes ────────
router.get('/urgent/open', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      "SELECT ur.*, u.company_name AS buyer_company, u.city AS buyer_city, (SELECT COUNT(*) FROM urgent_responses WHERE request_id=ur.id AND seller_id=$2) AS already_responded FROM urgent_requests ur JOIN users u ON ur.buyer_id = u.id WHERE ur.status IN ('open','matched') AND ur.expires_at > NOW() ORDER BY ur.urgency_level='critical' DESC, ur.created_at DESC",
      [req.user.id]
    );
    res.json({ requests: rows });
  } catch (err) { next(err); }
});

// ── PRICE SUGGESTION ──────────────────────────────────────────
router.post('/price-suggestion', authenticate, async (req, res, next) => {
  try {
    const { product_id, condition, category_id, brand } = req.body;

    // Analyser les prix similaires en base
    const { rows: similar } = await query(
      `SELECT AVG(price) AS avg_price, MIN(price) AS min_price, MAX(price) AS max_price, COUNT(*) AS count
       FROM products WHERE category_id = $1 AND condition = $2 AND status = 'active' AND id != $3`,
      [category_id, condition, product_id || '00000000-0000-0000-0000-000000000000']
    );

    const stats = similar[0];
    const avg = parseFloat(stats.avg_price) || 0;
    const suggested = avg > 0 ? Math.round(avg * 0.85) : null; // 15% sous le marché = avantage concurrentiel
    const confidence = Math.min(parseInt(stats.count) / 10, 1).toFixed(2);

    if (product_id && suggested) {
      await query(
        'INSERT INTO price_suggestions (product_id, suggested_price, min_price, max_price, confidence_score, based_on_count) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
        [product_id, suggested, parseFloat(stats.min_price) || 0, parseFloat(stats.max_price) || 0, confidence, parseInt(stats.count)]
      );
    }

    res.json({ suggested_price: suggested, min_price: parseFloat(stats.min_price) || null, max_price: parseFloat(stats.max_price) || null, confidence, based_on: parseInt(stats.count), message: suggested ? `Prix suggéré : ${suggested} MAD (15% sous le marché)` : 'Pas assez de données pour suggérer un prix' });
  } catch (err) { next(err); }
});

module.exports = router;
