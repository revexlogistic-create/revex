// routes/orders.js
const router = require('express').Router();
const { createOrder, getMyOrders, updateOrderStatus } = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const { requireTokens } = require('../middleware/tokens');

router.post('/',          authenticate, requireTokens('create_order'), createOrder);
router.get('/',           authenticate, getMyOrders);
router.put('/:id/status', authenticate, updateOrderStatus);
module.exports = router;
