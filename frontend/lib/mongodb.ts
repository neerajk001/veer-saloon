
import mongoose from 'mongoose';
import dns from 'node:dns';

const MONGODB_URI = process.env.MONGO_URI;

if (!MONGODB_URI) {
    throw new Error(
        'Please define the MONGO_URI environment variable inside .env.local'
    );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const configureDnsForMongoSrv = () => {
    if (!MONGODB_URI?.startsWith('mongodb+srv://')) return;
    const configured = process.env.MONGO_DNS_SERVERS || '8.8.8.8,1.1.1.1';
    const servers = configured
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    if (servers.length > 0) {
        dns.setServers(servers);
    }
};

const isSrvDnsError = (error: unknown): boolean => {
    const msg = String((error as any)?.message || '');
    return msg.includes('querySrv') || msg.includes('ECONNREFUSED _mongodb._tcp');
};

async function dbConnect() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
        };

        configureDnsForMongoSrv();
        cached.promise = mongoose.connect(MONGODB_URI!, opts);
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;

        // One retry for transient DNS/SRV issues.
        if (isSrvDnsError(e)) {
            await sleep(1200);
            const opts = {
                bufferCommands: false,
                serverSelectionTimeoutMS: 15000,
                connectTimeoutMS: 15000,
            };
            configureDnsForMongoSrv();
            cached.promise = mongoose.connect(MONGODB_URI!, opts);
            try {
                cached.conn = await cached.promise;
            } catch (retryError) {
                cached.promise = null;
                throw retryError;
            }
        } else {
            throw e;
        }
    }

    return cached.conn;
}

export default dbConnect;
