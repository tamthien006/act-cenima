const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/userPaymentProfileController');

const router = express.Router();

// GET /api/v1/users/:id/payment-methods
router.get('/:id/payment-methods', protect, ctrl.getPaymentMethods);
// PUT /api/v1/users/:id/payment-methods
router.put('/:id/payment-methods', protect, ctrl.updatePaymentMethods);

// GET /api/v1/users/:id/banks
router.get('/:id/banks', protect, ctrl.getBanks);
// PUT /api/v1/users/:id/banks
router.put('/:id/banks', protect, ctrl.updateBanks);

module.exports = router;
