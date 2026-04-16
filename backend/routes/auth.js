// ============================================================
// routes/auth.js
// ============================================================
const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const ctrl = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });
  next();
};

router.post('/register',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe minimum 8 caractères'),
  body('company_name').notEmpty().withMessage('Nom de société requis'),
  body('contact_name').notEmpty().withMessage('Nom du contact requis'),
  validate, ctrl.register
);
router.post('/login',
  body('email').isEmail(), body('password').notEmpty(), validate, ctrl.login
);
router.post('/refresh', ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);
router.get('/me', authenticate, ctrl.me);
router.put('/change-password', authenticate, ctrl.changePassword);

module.exports = router;
