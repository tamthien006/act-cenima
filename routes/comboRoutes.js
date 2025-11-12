const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
getCombos,
getComboById,
createCombo,
updateCombo,
deleteCombo,
getAvailableCombos
} = require('../controllers/comboController');
const router = express.Router();
router.get('/', getCombos);
router.get('/available', getAvailableCombos);
router.get('/:id', getComboById);
router.use(protect, admin);
router.post(
'/',
[
check('name', 'Combo name is required').not().isEmpty(),
check('description', 'Description is required').not().isEmpty(),
check('price', 'Price must be a positive number').isFloat({ min: 0 }),
check('items', 'Combo items are required').isArray({ min: 1 }),
check('items.*.name', 'Item name is required').not().isEmpty(),
check('items.*.quantity', 'Item quantity must be at least 1').isInt({ min: 1 }),
check('isActive', 'Active status must be a boolean').optional().isBoolean(),
check('imageUrl', 'Image URL must be a valid URL').optional().isURL(),
check('validFrom', 'Valid from date is required').optional().isISO8601(),
check('validTo', 'Valid to date must be after valid from').optional().isISO8601(),
check('applicableCinemas', 'Applicable cinemas must be an array of cinema IDs').optional().isArray()
],
createCombo
);
router.put(
'/:id',
[
check('name', 'Combo name is required').optional().not().isEmpty(),
check('description', 'Description is required').optional().not().isEmpty(),
check('price', 'Price must be a positive number').optional().isFloat({ min: 0 }),
check('items', 'Combo items must be an array').optional().isArray(),
check('items.*.name', 'Item name is required').optional().not().isEmpty(),
check('items.*.quantity', 'Item quantity must be at least 1').optional().isInt({ min: 1 }),
check('isActive', 'Active status must be a boolean').optional().isBoolean(),
check('imageUrl', 'Image URL must be a valid URL').optional().isURL(),
check('validFrom', 'Valid from date must be a valid date').optional().isISO8601(),
check('validTo', 'Valid to date must be a valid date').optional().isISO8601(),
check('applicableCinemas', 'Applicable cinemas must be an array of cinema IDs').optional().isArray()
],
updateCombo
);
router.delete('/:id', deleteCombo);
module.exports = router;