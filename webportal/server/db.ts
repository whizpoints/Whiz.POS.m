import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import { Agent, setGlobalDispatcher } from 'undici';
import dotenv from 'dotenv';
dotenv.config();

// Configure robust Undici Agent with KeepAlive & higher connection timeout
try {
  const agent = new Agent({
    connect: { timeout: 30_000 },
    keepAliveTimeout: 60_000,
    keepAliveMaxTimeout: 600_000,
    connections: 50,
    pipelining: 1
  });
  setGlobalDispatcher(agent);
} catch (e) {
  console.warn('[DB] Could not set global Undici dispatcher:', e);
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
