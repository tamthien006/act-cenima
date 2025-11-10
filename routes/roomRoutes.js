const express = require('express');
const { check } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
getRooms,
getRoomWithSeats,
createRoom,
updateRoom,
deleteRoom
} = require('../controllers/roomController');
const Cinema = require('../models/Cinema');
const router = express.Router();
router.get('/', getRooms);
router.get('/:roomId/seats', getRoomWithSeats);
router.post(
'/',
[
protect,
admin,
[
check('name', 'Please add a name').not().isEmpty(),
check('cinemaId', 'Please provide a valid cinema ID').isMongoId(),
check('capacity', 'Please add a valid capacity').isInt({ min: 1 }),
check('screenType', 'Please provide a valid screen type').isIn(['standard', '3d', 'imax', '4dx'])
]
],
createRoom
);
router.put(
'/:id',
[
protect,
admin,
[
check('name', 'Please add a name').optional().not().isEmpty(),
check('cinemaId', 'Please provide a valid cinema ID').optional().isMongoId(),
check('capacity', 'Please add a valid capacity').optional().isInt({ min: 1 }),
check('screenType', 'Please provide a valid screen type').optional().isIn(['standard', '3d', 'imax', '4dx'])
]
],
updateRoom
);
router.delete('/:id', [protect, admin], deleteRoom);
module.exports = router;