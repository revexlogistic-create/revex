// routes/messages.js
const router = require('express').Router();
const ctrl   = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');
const { requireTokens } = require('../middleware/tokens');
const { query } = require('../config/db');

// Middleware qui consomme 1 jeton SEULEMENT si c'est une nouvelle conversation
const tokenIfNewConv = async (req, res, next) => {
  try {
    if (req.user?.role === 'admin') return next(); // admins exemptés

    const { recipient_id } = req.body;
    if (!recipient_id) return next(); // pas de destinataire = pas de jeton

    // Vérifier si une conversation existe déjà entre ces 2 utilisateurs
    const { rows } = await query(`
      SELECT id FROM conversations
      WHERE (participant_1 = $1 AND participant_2 = $2)
         OR (participant_1 = $2 AND participant_2 = $1)
      LIMIT 1
    `, [req.user.id, recipient_id]);

    if (rows.length > 0) {
      // Conversation existante → réponse gratuite
      return next();
    }

    // Nouvelle conversation → consommer 1 jeton
    return requireTokens('send_message')(req, res, next);
  } catch (err) {
    next(err);
  }
};

router.get('/conversations',         authenticate, ctrl.getConversations);
router.get('/conversations/:id',     authenticate, ctrl.getMessages);
router.post('/send',                 authenticate, tokenIfNewConv, ctrl.sendMessage);
router.get('/notifications',         authenticate, ctrl.getNotifications);
router.put('/notifications/read',    authenticate, ctrl.markNotificationsRead);

module.exports = router;
