const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`.cyan.underline);

    // Ensure indexes are in sync (update text index options and drop old TTLs)
    try {
      const Movie = require('../models/Movie');
      const Ticket = require('../models/Ticket');
      await Movie.syncIndexes();
      await Ticket.syncIndexes();
      console.log('✅ Movie indexes synchronized');
      console.log('✅ Ticket indexes synchronized');

      // Backfill missing scheduleId for tickets to avoid unique index issues
      try {
        const missing = await Ticket.find({ $or: [{ scheduleId: { $exists: false } }, { scheduleId: null }] })
          .select('_id showtime scheduleId')
          .limit(500)
          .lean();
        if (missing.length > 0) {
          const bulk = Ticket.collection.initializeUnorderedBulkOp();
          missing.forEach(doc => {
            if (doc.showtime) {
              bulk.find({ _id: doc._id }).updateOne({ $set: { scheduleId: doc.showtime } });
            }
          });
          if (bulk.length > 0) {
            const res = await bulk.execute();
            console.log(`🔧 Backfilled scheduleId for ${res?.nModified || 0} tickets`);
          }
        }
      } catch (bfErr) {
        console.warn('Backfill scheduleId skipped:', bfErr?.message || bfErr);
      }
    } catch (idxErr) {
      console.error('Failed to sync Movie indexes:', idxErr.message);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`.red.underline.bold);
    process.exit(1);
  }
};

module.exports = connectDB;
