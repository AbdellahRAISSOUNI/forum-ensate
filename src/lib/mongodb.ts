import mongoose, { ConnectionStates } from 'mongoose';

declare global {
    // eslint-disable-next-line no-var
    var _mongooseConnection: { promise: Promise<typeof mongoose> | null; conn: typeof mongoose | null } | undefined;
}

const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in environment variables');
}

let cached = global._mongooseConnection;
if (!cached) {
    cached = global._mongooseConnection = { promise: null, conn: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        // Avoid deprecation warnings; Mongoose 7+ uses native promises
        cached.promise = mongoose
            .connect(MONGODB_URI as string, {
                // Buffering false so app fails fast if not connected when querying in server actions
                bufferCommands: false,
                // Keepalive and timeouts to be resilient in serverless/edge-like envs
                serverSelectionTimeoutMS: 10000,
                socketTimeoutMS: 45000,
            })
            .then((mongooseInstance) => {
                return mongooseInstance;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        throw error;
    }

    return cached.conn!;
}

export function isMongooseConnected(): boolean {
    // 1 means connected, 2 connecting in Mongoose ConnectionStates
    const state = mongoose.connection.readyState as ConnectionStates;
    return state === 1;
}


