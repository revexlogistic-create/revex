// routes/categories.js
const router = require('express').Router();
const { query } = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/categories — liste complète avec arbre
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(`
      SELECT c.*, p.name AS parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.is_active = true
      ORDER BY c.parent_id NULLS FIRST, c.sort_order, c.name
    `);
    // Construire l'arbre parent/enfants
    const parents = rows.filter(r => !r.parent_id);
    const tree = parents.map(p => ({ ...p, children: rows.filter(c => c.parent_id === p.id) }));
    res.json({ categories: rows, tree });
  } catch (err) { next(err); }
});

// GET /api/categories/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM categories WHERE slug = $1', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Catégorie introuvable' });
    res.json({ category: rows[0] });
  } catch (err) { next(err); }
});

// POST /api/categories — admin seulement
router.post('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, slug, parent_id, icon, description, sort_order } = req.body;
    const { rows } = await query(
      'INSERT INTO categories (name, slug, parent_id, icon, description, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, slug, parent_id || null, icon || null, description || null, sort_order || 0]
    );
    res.status(201).json({ category: rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
