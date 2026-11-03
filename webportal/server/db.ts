import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import { Agent, setGlobalDispatcher } from 'undici';
import dotenv from 'dotenv';
dotenv.config();

// Configure robust Undici Agent with short keep-alive to prevent stale idle socket drops (UND_ERR_SOCKET)
try {
  const agent = new Agent({
    connect: { timeout: 15_000 },
    keepAliveTimeout: 3_000,
    keepAliveMaxTimeout: 10_000,
    connections: 50,
    pipelining: 1
  });

  setGlobalDispatcher(agent);
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
