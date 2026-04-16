// middleware/tokens.js — Système de jetons REVEX
const { query } = require('../config/db');

// ── Coût en jetons par opération ─────────────────────────────
const TOKEN_COSTS = {
  publish_product:   5,   // Publier un PDR
  bulk_publish:      1,   // Par article (publication en masse)
  send_quote:        2,   // Envoyer un devis
  create_order:      3,   // Passer une commande
  send_message:      1,   // Envoyer un message (1er message conv)
  stock_analysis:   10,   // Lancer une analyse CCOM
  urgent_request:    5,   // Demande urgente
  publish_transport: 3,   // Publier une offre transport
};

// ── Opérations GRATUITES (admins et certaines actions) ───────
const FREE_OPERATIONS = new Set(['stock_analysis_demo']);

/**
 * Middleware factory — vérifie et déduit les jetons
 * Usage : requireTokens('publish_product')
 * Usage avec quantité dynamique : requireTokens('bulk_publish', req => req.body.items?.length || 1)
 */
const requireTokens = (operation, quantityFn = null) => {
  return async (req, res, next) => {
    try {
      // Admins exemptés
      if (req.user?.role === 'admin') return next();

      const baseCost = TOKEN_COSTS[operation] || 0;
      if (baseCost === 0) return next();

      const qty  = quantityFn ? (typeof quantityFn === 'function' ? quantityFn(req) : quantityFn) : 1;
      const cost = baseCost * Math.max(1, parseInt(qty) || 1);

      // Récupérer balance actuelle
      const { rows } = await query(
        'SELECT tokens_balance FROM users WHERE id = $1',
        [req.user.id]
      );
      if (!rows.length) return res.status(401).json({ error: 'Utilisateur introuvable' });

      const balance = rows[0].tokens_balance;

      if (balance < cost) {
        return res.status(402).json({
          error: `Jetons insuffisants`,
          code: 'INSUFFICIENT_TOKENS',
          required: cost,
          available: balance,
          operation,
          message: `Cette opération nécessite ${cost} jeton(s). Vous en avez ${balance}. Rechargez votre compte.`
        });
      }

      // Déduire les jetons
      const newBalance = balance - cost;
      await query('UPDATE users SET tokens_balance = $1 WHERE id = $2', [newBalance, req.user.id]);

      // Enregistrer la transaction
      await query(`
        INSERT INTO token_transactions (user_id, type, operation, amount, balance_after, description, ref_id)
        VALUES ($1, 'debit', $2, $3, $4, $5, $6)`,
        [req.user.id, operation, -cost, newBalance,
         `${operationLabel(operation)}${qty > 1 ? ` (×${qty})` : ''}`,
         req.body?.product_id || req.body?.order_id || req.params?.id || null]
      );

      // Attacher infos au request pour utilisation dans le controller
      req.tokensCost    = cost;
      req.tokensBalance = newBalance;
      next();

    } catch (err) {
      next(err);
    }
  };
};

/**
 * Créditer des jetons (achat, admin, bonus)
 */
const creditTokens = async (userId, amount, operation, description, refId = null) => {
  const { rows } = await query('SELECT tokens_balance FROM users WHERE id = $1', [userId]);
  if (!rows.length) throw new Error('Utilisateur introuvable');

  const newBalance = rows[0].tokens_balance + amount;
  await query('UPDATE users SET tokens_balance = $1 WHERE id = $2', [newBalance, userId]);

  await query(`
    INSERT INTO token_transactions (user_id, type, operation, amount, balance_after, description, ref_id)
    VALUES ($1, 'credit', $2, $3, $4, $5, $6)`,
    [userId, operation, amount, newBalance, description, refId]
  );

  return newBalance;
};

const operationLabel = (op) => {
  const labels = {
    publish_product:   'Publication PDR',
    bulk_publish:      'Publication en masse',
    send_quote:        'Envoi devis',
    create_order:      'Commande',
    send_message:      'Message',
    stock_analysis:    'Analyse CCOM',
    urgent_request:    'Demande urgente',
    publish_transport: 'Offre transport',
    purchase:          'Achat de jetons',
    admin_credit:      'Crédit admin',
    welcome_bonus:     'Bonus bienvenue',
    refund:            'Remboursement',
  };
  return labels[op] || op;
};

module.exports = { requireTokens, creditTokens, TOKEN_COSTS, operationLabel };
