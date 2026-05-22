const cron = require('node-cron');
const Poll = require('../models/Poll');

/**
 * startCleanupCron
 * Runs every day at midnight.
 * Deletes anonymous/guest polls that were closed more than 30 days ago.
 * Registered user polls are preserved.
 */
const startCleanupCron = () => {
  // Schedule: every day at 00:00
  cron.schedule('0 0 * * *', async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const result = await Poll.deleteMany({
        creator: null, // guest/anonymous polls only
        isClosed: true,
        closedAt: { $lt: thirtyDaysAgo }
      });

      if (result.deletedCount > 0) {
        console.log(`🧹 Cleanup: Deleted ${result.deletedCount} expired anonymous poll(s)`);
      }
    } catch (error) {
      console.error('❌ Cleanup cron error:', error);
    }
  });

  console.log('⏰ Auto-cleanup cron job started (runs daily at midnight)');
};

module.exports = { startCleanupCron };
