// routes/tokens.js — Gestion des jetons REVEX
const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { creditTokens, TOKEN_COSTS, operationLabel } = require('../middleware/tokens');

// ── Ma balance + historique ───────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows: user } = await query(
      'SELECT tokens_balance FROM users WHERE id = $1', [req.user.id]
    );
    const { rows: history } = await query(`
      SELECT * FROM token_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50`, [req.user.id]
    );
    const { rows: stats } = await query(`
      SELECT
        SUM(CASE WHEN type='debit'  THEN ABS(amount) ELSE 0 END) AS total_spent,
        SUM(CASE WHEN type='credit' THEN amount       ELSE 0 END) AS total_earned,
        COUNT(*) AS total_operations
      FROM token_transactions WHERE user_id = $1`, [req.user.id]
    );

    res.json({
      balance:    user[0]?.tokens_balance || 0,
      history,
      stats:      stats[0],
      costs:      TOKEN_COSTS
    });
  } catch (err) { next(err); }
});

// ── Forfaits disponibles ──────────────────────────────────────
router.get('/packages', async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM token_packages WHERE is_active = true ORDER BY tokens ASC'
    );
    res.json({ packages: rows });
  } catch (err) { next(err); }
});

// ── Acheter des jetons (simulé pour MVP) ──────────────────────
router.post('/purchase', authenticate, async (req, res, next) => {
  try {
    const { package_id, payment_method = 'simulated' } = req.body;
    if (!package_id) return res.status(400).json({ error: 'package_id manquant' });

    const { rows: pkgs } = await query(
      'SELECT * FROM token_packages WHERE id = $1 AND is_active = true', [package_id]
    );
    if (!pkgs.length) return res.status(404).json({ error: 'Forfait introuvable' });

    const pkg = pkgs[0];
    const totalTokens = pkg.tokens + Math.floor(pkg.tokens * (pkg.bonus_pct || 0) / 100);

    const newBalance = await creditTokens(
      req.user.id,
      totalTokens,
      'purchase',
      `Achat forfait "${pkg.name}" — ${pkg.tokens} jetons${pkg.bonus_pct > 0 ? ` + ${Math.floor(pkg.tokens * pkg.bonus_pct / 100)} bonus` : ''}`,
    );

    // Notification
    query(`INSERT INTO notifications (user_id, type, title, body) VALUES ($1,'tokens_purchased',$2,$3)`,
      [req.user.id,
       `✅ ${totalTokens} jetons crédités !`,
       `Votre forfait "${pkg.name}" a été activé. Solde : ${newBalance} jetons.`]
    ).catch(() => {});

    res.json({
      message:     `${totalTokens} jetons crédités sur votre compte !`,
      tokens_added: totalTokens,
      new_balance:  newBalance,
      package:      pkg
    });
  } catch (err) { next(err); }
});

// ── Admin : créditer manuellement ────────────────────────────
router.post('/admin/credit', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { user_id, amount, reason } = req.body;
    if (!user_id || !amount) return res.status(400).json({ error: 'user_id et amount requis' });
    if (amount <= 0) return res.status(400).json({ error: 'Montant invalide' });

    const newBalance = await creditTokens(
      user_id, parseInt(amount), 'admin_credit',
      reason || `Crédit manuel par admin`
    );

    query(`INSERT INTO notifications (user_id,type,title,body) VALUES ($1,'tokens_credited',$2,$3)`,
      [user_id, `🎁 ${amount} jetons offerts !`, reason || 'Votre compte a été crédité par l\'équipe REVEX.']
    ).catch(() => {});

    res.json({ message: `${amount} jetons crédités`, new_balance: newBalance });
  } catch (err) { next(err); }
});

// ── Admin : stats globales jetons ────────────────────────────
router.get('/admin/stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [global, topUsers, recentTx] = await Promise.all([
      query(`SELECT
        SUM(tokens_balance) AS total_circulating,
        AVG(tokens_balance) AS avg_balance,
        COUNT(*) FILTER (WHERE tokens_balance = 0) AS zero_balance_users,
        COUNT(*) FILTER (WHERE tokens_balance < 5)  AS low_balance_users
        FROM users WHERE role != 'admin'`),
      query(`SELECT id, company_name, email, tokens_balance
        FROM users WHERE role != 'admin'
        ORDER BY tokens_balance DESC LIMIT 10`),
      query(`SELECT tt.*, u.company_name
        FROM token_transactions tt
        JOIN users u ON tt.user_id = u.id
        ORDER BY tt.created_at DESC LIMIT 20`)
    ]);

    res.json({
      global:    global.rows[0],
      topUsers:  topUsers.rows,
      recentTx:  recentTx.rows,
      costs:     TOKEN_COSTS
    });
  } catch (err) { next(err); }
});

module.exports = router;
