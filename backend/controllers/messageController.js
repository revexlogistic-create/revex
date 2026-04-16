// controllers/messageController.js — Messagerie B2B
const { query } = require('../config/db');

// ── MES CONVERSATIONS ─────────────────────────────────────────
const getConversations = async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT
        c.id, c.product_id, c.last_message_at,
        -- Interlocuteur (l'autre participant)
        CASE WHEN c.participant_1 = $1 THEN u2.id ELSE u1.id END AS other_id,
        CASE WHEN c.participant_1 = $1 THEN u2.company_name ELSE u1.company_name END AS other_company,
        CASE WHEN c.participant_1 = $1 THEN u2.avatar_url ELSE u1.avatar_url END AS other_avatar,
        CASE WHEN c.participant_1 = $1 THEN u2.role ELSE u1.role END AS other_role,
        -- Dernier message
        m.content AS last_message,
        m.sender_id AS last_sender_id,
        -- Messages non lus
        (SELECT COUNT(*) FROM messages msg WHERE msg.conversation_id = c.id AND msg.sender_id != $1 AND msg.is_read = false) AS unread_count,
        -- Produit
        p.title AS product_title, p.images AS product_images
      FROM conversations c
      JOIN users u1 ON c.participant_1 = u1.id
      JOIN users u2 ON c.participant_2 = u2.id
      LEFT JOIN LATERAL (SELECT content, sender_id FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) m ON true
      LEFT JOIN products p ON c.product_id = p.id
      WHERE c.participant_1 = $1 OR c.participant_2 = $1
      ORDER BY c.last_message_at DESC
    `, [req.user.id]);

    res.json({ conversations: rows });
  } catch (err) { next(err); }
};

// ── MESSAGES D'UNE CONVERSATION ───────────────────────────────
const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Vérifier accès
    const { rows: conv } = await query(
      'SELECT * FROM conversations WHERE id = $1 AND (participant_1 = $2 OR participant_2 = $2)',
      [id, req.user.id]
    );
    if (!conv.length) return res.status(403).json({ error: 'Conversation introuvable ou accès interdit' });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows } = await query(`
      SELECT m.*, u.company_name AS sender_company, u.avatar_url AS sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at ASC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `, [id]);

    // Marquer comme lu
    await query('UPDATE messages SET is_read = true, read_at = NOW() WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false', [id, req.user.id]);

    res.json({ messages: rows, conversation: conv[0] });
  } catch (err) { next(err); }
};

// ── ENVOYER MESSAGE ───────────────────────────────────────────
const sendMessage = async (req, res, next) => {
  try {
    const { recipient_id, product_id, content, type = 'text', metadata } = req.body;

    if (!recipient_id) return res.status(400).json({ error: 'recipient_id manquant' });
    if (!content?.trim()) return res.status(400).json({ error: 'Message vide' });

    // Ordonner les participants (toujours p1 < p2 en UUID string)
    const p1 = req.user.id < recipient_id ? req.user.id : recipient_id;
    const p2 = req.user.id < recipient_id ? recipient_id : req.user.id;

    // Chercher une conversation existante
    let { rows: convRows } = await query(
      `SELECT id FROM conversations
       WHERE participant_1 = $1 AND participant_2 = $2
         AND ($3::uuid IS NULL AND product_id IS NULL
              OR product_id = $3::uuid)
       LIMIT 1`,
      [p1, p2, product_id || null]
    );

    let conversationId;
    if (!convRows.length) {
      const { rows } = await query(
        'INSERT INTO conversations (participant_1, participant_2, product_id) VALUES ($1, $2, $3) RETURNING id',
        [p1, p2, product_id || null]
      );
      conversationId = rows[0].id;
    } else {
      conversationId = convRows[0].id;
    }

    // Insérer le message
    const { rows } = await query(
      'INSERT INTO messages (conversation_id, sender_id, type, content, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [conversationId, req.user.id, type, content.trim(), JSON.stringify(metadata || {})]
    );

    // Mettre à jour last_message_at
    await query('UPDATE conversations SET last_message_at = NOW() WHERE id = $1', [conversationId]);

    // Notification (ne pas bloquer si erreur)
    query(
      `INSERT INTO notifications (user_id, type, title, body, data) VALUES ($1, 'new_message', $2, $3, $4)`,
      [recipient_id, `Nouveau message de ${req.user.company_name}`, content.substring(0, 100), JSON.stringify({ conversation_id: conversationId })]
    ).catch(() => {});

    res.status(201).json({ message: rows[0], conversation_id: conversationId });
  } catch (err) { next(err); }
};

// ── NOTIFICATIONS ─────────────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    const unread = rows.filter(n => !n.is_read).length;
    res.json({ notifications: rows, unread });
  } catch (err) { next(err); }
};

const markNotificationsRead = async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Notifications marquées comme lues' });
  } catch (err) { next(err); }
};

module.exports = { getConversations, getMessages, sendMessage, getNotifications, markNotificationsRead };
