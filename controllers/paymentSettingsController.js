const PaymentSettings = require('../models/PaymentSettings');
const { validationResult } = require('express-validator');

// GET /api/v1/settings/payment
// Logic: nếu có cinemaId -> lấy theo cinema (scope=cinema, cinemaId)
// Nếu không có hoặc không tìm thấy -> fallback global
// Không bao giờ trả sai record; không báo lỗi khi global tồn tại/thiếu
exports.getPaymentSettings = async (req, res, next) => {
  try {
    const cinemaId = req.query.cinemaId;
    let doc = null;
    if (cinemaId) {
      doc = await PaymentSettings
        .findOne({ scope: 'cinema', cinemaId })
        .sort({ updatedAt: -1 })
        .lean();
    }
    if (!doc) {
      doc = await PaymentSettings
        .findOne({ scope: 'global' })
        .sort({ updatedAt: -1 })
        .lean();
    }
    // Final fallback: latest any-scope doc
    if (!doc) {
      doc = await PaymentSettings
        .findOne({})
        .sort({ updatedAt: -1 })
        .lean();
    }
    if (!doc) {
     doc = {
        scope: 'global',
        bankName: process.env.DEFAULT_BANK_NAME || 'Ngân hàng : ACT BANK',
        accountNumber: process.env.DEFAULT_ACCOUNT_NUMBER || 'Số Tài Khoản : 99992345636389',
        accountName: process.env.DEFAULT_ACCOUNT_NAME || 'Chủ tài khoản : Ngân Hàng ACT BANK',
        branch: process.env.DEFAULT_BANK_BRANCH || 'Chi nhánh : Hà Nội',
        qrStaticUrl: process.env.DEFAULT_QR_STATIC_URL || 'https://res.cloudinary.com/dnacncjp6/image/upload/v1763823085/actbank.png'
      };
    }
    return res.status(200).json({ success: true, data: doc || null });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/settings/payment (Admin)
// Cho phép cập nhật global hoặc cinema-scoped (nếu body.scope='cinema' và có cinemaId)
exports.updatePaymentSettings = async (req, res, next) => {
  try {
    const scope = (req.body.scope === 'cinema') ? 'cinema' : 'global';
    const cinemaId = scope === 'cinema' ? req.body.cinemaId : undefined;
    const payload = {
      scope,
      ...(cinemaId ? { cinemaId } : {}),
      bankName: req.body.bankName || '',
      accountNumber: req.body.accountNumber || '',
      accountName: req.body.accountName || '',
      branch: req.body.branch || '',
      qrStaticUrl: req.body.qrStaticUrl || '',
      noteTemplate: req.body.noteTemplate || 'NDCK: TICKET_{ticketId} USER_{userId}',
      updatedBy: req.user?.id || undefined
    };
    const filter = scope === 'cinema' ? { scope, cinemaId } : { scope: 'global' };
    const doc = await PaymentSettings.findOneAndUpdate(
      filter,
      { $set: payload },
      { upsert: true, new: true }
    );
    return res.status(200).json({ success: true, data: doc, message: 'Cập nhật cấu hình thanh toán thành công' });
  } catch (err) {
    next(err);
  }
};
