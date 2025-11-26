const UserPaymentProfile = require('../models/UserPaymentProfile');

function isOwnerOrAdmin(req, targetUserId) {
  const user = req.user || {};
  if (!user) return false;
  if (user.role === 'admin') return true;
  const uid = String(user.id || user._id || '');
  return uid === String(targetUserId || '');
}

exports.getPaymentMethods = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isOwnerOrAdmin(req, id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    let prof = await UserPaymentProfile.findOne({ user: id });
    if (!prof) {
      prof = await UserPaymentProfile.create({ user: id });
    }
    return res.status(200).json({ success: true, data: prof.methods });
  } catch (err) { next(err); }
};

exports.updatePaymentMethods = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isOwnerOrAdmin(req, id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    let prof = await UserPaymentProfile.findOne({ user: id });
    if (!prof) prof = new UserPaymentProfile({ user: id });

    const allowed = ['momo','vietqr','vnpay','zalopay'];
    const body = req.body || {};
    if (body.defaultMethod) prof.methods.defaultMethod = String(body.defaultMethod);
    if (body.momo) prof.methods.momo = { ...prof.methods.momo.toObject?.() || {}, ...body.momo };
    if (body.vietqr) prof.methods.vietqr = { ...prof.methods.vietqr.toObject?.() || {}, ...body.vietqr };
    if (body.vnpay) prof.methods.vnpay = { ...prof.methods.vnpay.toObject?.() || {}, ...body.vnpay };
    if (body.zalopay) prof.methods.zalopay = { ...prof.methods.zalopay.toObject?.() || {}, ...body.zalopay };

    // normalize: if set preferred wallet, unset others handled in pre-save
    await prof.save();
    return res.status(200).json({ success: true, data: prof.methods });
  } catch (err) { next(err); }
};

exports.getBanks = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isOwnerOrAdmin(req, id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    let prof = await UserPaymentProfile.findOne({ user: id });
    if (!prof) prof = await UserPaymentProfile.create({ user: id });
    return res.status(200).json({ success: true, data: prof.banks || [] });
  } catch (err) { next(err); }
};

exports.updateBanks = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isOwnerOrAdmin(req, id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    const { banks } = req.body || {};
    if (!Array.isArray(banks)) {
      return res.status(400).json({ success: false, message: 'banks must be an array' });
    }
    let prof = await UserPaymentProfile.findOne({ user: id });
    if (!prof) prof = new UserPaymentProfile({ user: id });

    prof.banks = (banks || []).map(b => ({
      bankName: b.bankName,
      accountNumber: b.accountNumber,
      accountName: b.accountName,
      branch: b.branch,
      note: b.note,
      preferred: !!b.preferred
    }));
    await prof.save();
    return res.status(200).json({ success: true, data: prof.banks });
  } catch (err) { next(err); }
};
