const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
getCinemas,
getCinema,
createCinema,
updateCinema,
deleteCinema
} = require('../controllers/cinemaController');
const router = express.Router();
router.get('/', getCinemas);
router.get('/:id', getCinema);
router.post(
'/',
[
protect,
admin,
[
check('name', 'Please add a name').not().isEmpty(),
check('address', 'Please add an address').not().isEmpty(),
check('location.city', 'Please add a city').not().isEmpty(),
check('location.country', 'Please add a country').not().isEmpty()
]
],
createCinema
);
router.put(
'/:id',
[
protect,
admin,
[
check('name', 'Please add a name').optional().not().isEmpty(),
check('address', 'Please add an address').optional().not().isEmpty()
]
],
updateCinema
);
router.delete('/:id', [protect, admin], deleteCinema);
module.exports = router;