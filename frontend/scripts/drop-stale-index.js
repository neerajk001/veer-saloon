/**
 * One-time script: Drop the stale unique index on { date: 1, startTime: 1 }
 * from the appointments collection.
 *
 * Mongoose only CREATES indexes — it never drops old ones that were removed
 * from the schema. The old partial-unique index must be dropped manually,
 * otherwise it will still reject two bookings that happen to share the
 * exact same startTime (even if they don't overlap at all).
 *
 * Run once:  node scripts/drop-stale-index.js
 */

const mongoose = require('mongoose');
const dns = require('node:dns');
require('dotenv').config({ path: '.env.local' });

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
    console.error('MONGO_URI not found in .env.local');
    process.exit(1);
}

// Use public DNS servers for SRV resolution (same as lib/mongodb.ts)
if (MONGO_URI.startsWith('mongodb+srv://')) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
}

async function main() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const db = mongoose.connection.db;
    const collection = db.collection('appointments');

    // List current indexes
    const indexes = await collection.indexes();
    console.log('\nCurrent indexes on "appointments":');
    for (const idx of indexes) {
        console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' (UNIQUE)' : ''}${idx.partialFilterExpression ? ' (PARTIAL)' : ''}`);
    }

    // Find the stale index: key is { date: 1, startTime: 1 } with unique: true
    const staleIndex = indexes.find(
        (idx) =>
            idx.unique &&
            idx.key &&
            idx.key.date === 1 &&
            idx.key.startTime === 1 &&
            Object.keys(idx.key).length === 2
    );

    if (staleIndex) {
        console.log(`\nDropping stale index: "${staleIndex.name}"...`);
        await collection.dropIndex(staleIndex.name);
        console.log('✅ Stale index dropped successfully.');
    } else {
        console.log('\n✅ No stale unique index found — nothing to drop.');
    }

    // Verify
    const remainingIndexes = await collection.indexes();
    console.log('\nRemaining indexes:');
    for (const idx of remainingIndexes) {
        console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    }

    await mongoose.disconnect();
    console.log('\nDone.');
}

main().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
