import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import { Agent, RetryAgent, setGlobalDispatcher } from 'undici';
import dotenv from 'dotenv';
dotenv.config();

// Configure robust Undici Agent with short keep-alive, zero pipelining, and automatic retry on closed sockets
try {
  const baseAgent = new Agent({
    connect: { timeout: 15_000 },
    keepAliveTimeout: 5_000,
    keepAliveMaxTimeout: 15_000,
    connections: 30,
    pipelining: 0
  });

  const retryAgent = new RetryAgent(baseAgent, {
    maxRetries: 4,
    minTimeout: 50,
    maxTimeout: 1000,
    timeoutFactor: 2,
    retryAfter: true,
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'DELETE', 'PATCH']
  });

  setGlobalDispatcher(retryAgent);
} catch (e) {
  console.warn('[DB] Could not set global Undici dispatcher:', e);
}

export async function withDbRetry<T>(fn: () => Promise<T>, maxAttempts = 3, delayMs = 100): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isSocketError = 
        err?.message?.includes('fetch failed') ||
        err?.message?.includes('other side closed') ||
        err?.cause?.code === 'UND_ERR_SOCKET' ||
        err?.code === 'UND_ERR_SOCKET';

      if (attempt >= maxAttempts || !isSocketError) {
        throw err;
      }
      await new Promise(res => setTimeout(res, delayMs * attempt));
    }
  }
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  let tursoUrl = process.env.TURSO_DATABASE_URL || 'https://whizpos-whizposdata.aws-us-east-2.turso.io';
  if (tursoUrl.startsWith('libsql://')) {
    tursoUrl = tursoUrl.replace('libsql://', 'https://');
  }
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  const libsql = createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
    concurrency: 50,
  });

  const adapter = new PrismaLibSQL(libsql);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
