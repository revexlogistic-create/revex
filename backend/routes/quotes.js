// routes/quotes.js
const router = require('express').Router();
const { quoteController } = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { requireTokens } = require('../middleware/tokens');

router.post('/',           authenticate, requireTokens('send_quote'), quoteController.createQuote);
router.get('/',            authenticate, quoteController.getMyQuotes);
router.put('/:id/respond', authenticate, quoteController.respondToQuote);
module.exports = router;
