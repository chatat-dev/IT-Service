const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const initCleanupJob = () => {
    // Run at 02:00 AM every day to clean up attachments older than 7 days
    cron.schedule('0 2 * * *', async () => {
        console.log('🕒 Running auto-cleanup job for old attachments...');
        try {
            const retentionDays = 7;
            const msInDay = 24 * 60 * 60 * 1000;
            const now = Date.now();

            const directoriesToScan = [
                path.join(__dirname, '..', 'uploads', 'chat'),
                path.join(__dirname, '..', 'uploads', 'tickets')
            ];

            let deletedCount = 0;

            directoriesToScan.forEach(dir => {
                if (fs.existsSync(dir)) {
                    fs.readdirSync(dir).forEach(file => {
                        const filePath = path.join(dir, file);
                        const stats = fs.statSync(filePath);
                        if (stats.isFile()) {
                            // Check file modification time instead of upload db
                            // If file is older than 7 days
                            if ((now - stats.mtimeMs) > (retentionDays * msInDay)) {
                                fs.unlinkSync(filePath);
                                deletedCount++;
                            }
                        }
                    });
                }
            });

            console.log(`✅ Cleanup job finished. Deleted ${deletedCount} old files.`);
        } catch (error) {
            console.error('❌ Error in auto-cleanup job:', error);
        }
    });
};

module.exports = initCleanupJob;
