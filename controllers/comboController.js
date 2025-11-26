const Combo = require('../models/Combo');
const { validationResult } = require('express-validator');
exports.getCombos = async (req, res, next) => {
try {
const { status = 'active', page = 1, limit = 10 } = req.query;
const query = {};
if (status && status !== 'all') {
query.isActive = status === 'active';
}
const combos = await Combo.find(query)
.sort({ createdAt: -1 })
.limit(limit * 1)
.skip((page - 1) * limit);
const count = await Combo.countDocuments(query);
res.status(200).json({
success: true,
count: combos.length,
total: count,
totalPages: Math.ceil(count / limit),
currentPage: parseInt(page),
data: combos
});
} catch (err) {
next(err);
}
};
exports.getAvailableCombos = async (req, res, next) => {
  try {
    const { cinemaId } = req.query;
    const now = new Date();

    const andConditions = [
      { isActive: true },
      { $or: [
        { validFrom: { $exists: false } },
        { validFrom: { $lte: now } }
      ]},
      { $or: [
        { validTo: { $exists: false } },
        { validTo: { $gte: now } }
      ]}
    ];

    if (cinemaId) {
      andConditions.push({
        $or: [
          { availableAt: { $exists: false } },
          { availableAt: { $size: 0 } },
          { availableAt: cinemaId }
        ]
      });
    }

    const query = { $and: andConditions };

    const combos = await Combo.find(query)
      .select('name description price imageUrl items')
      .sort({ price: 1 });

    res.status(200).json({
      success: true,
      count: combos.length,
      data: combos
    });
  } catch (err) {
    next(err);
  }
};
exports.getComboById = async (req, res, next) => {
try {
const combo = await Combo.findById(req.params.id);
if (!combo) {
return res.status(404).json({
success: false,
message: 'Combo not found'
});
}
res.status(200).json({
success: true,
data: combo
});
} catch (err) {
next(err);
}
};
exports.createCombo = async (req, res, next) => {
try {
const errors = validationResult(req);
if (!errors.isEmpty()) {
return res.status(400).json({ 
success: false,
errors: errors.array() 
});
}
const combo = await Combo.create(req.body);
res.status(201).json({
success: true,
data: combo
});
} catch (err) {
next(err);
}
};
exports.updateCombo = async (req, res, next) => {
try {
const errors = validationResult(req);
if (!errors.isEmpty()) {
return res.status(400).json({ 
success: false,
errors: errors.array() 
});
}
let combo = await Combo.findById(req.params.id);
if (!combo) {
return res.status(404).json({
success: false,
message: 'Combo not found'
});
}
const { _id, createdAt, updatedAt, ...updateData } = req.body;
combo = await Combo.findByIdAndUpdate(req.params.id, updateData, {
new: true,
runValidators: true
});
res.status(200).json({
success: true,
data: combo
});
} catch (err) {
next(err);
}
};
exports.deleteCombo = async (req, res, next) => {
try {
const combo = await Combo.findById(req.params.id);
if (!combo) {
return res.status(404).json({
success: false,
message: 'Combo not found'
});
}
const ticketCount = await Ticket.countDocuments({ 'combos.comboId': combo._id });
if (ticketCount > 0) {
return res.status(400).json({
success: false,
message: 'Cannot delete combo as it has been used in tickets. Consider deactivating it instead.'
});
}
await combo.remove();
res.status(200).json({
success: true,
data: {}
});
} catch (err) {
next(err);
}
};