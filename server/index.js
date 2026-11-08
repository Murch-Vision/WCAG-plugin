#!/usr/bin/env node
/**
 * Хүртээмжийн скан үйлчилгээ (hurteemj scanner).
 *
 *   node server/index.js                       # http://localhost:8080
 *   node server/index.js keys create "CI"      # шинэ API түлхүүр
 *   node server/index.js keys list | keys revoke <id>
 *
 * Тохиргоо (орчны хувьсагч):
 *   PORT=8080  HOST=0.0.0.0  HJ_DB=./data/hurteemj.db  HJ_CONCURRENCY=2  HJ_MAX_PAGES=50
 *   HJ_ADMIN_KEY=hj_...          — эхний админ түлхүүр (заагаагүй бол анх асаахад үүсгэж хэвлэнэ)
 *   HJ_PUBLIC_URL=https://a11y.example.mn  — webhook доторх холбоосод
 *   HJ_WEBHOOK_SECRET=...        — webhook-ийн HMAC-SHA256 гарын үсэг
 *   HJ_ALLOW_PRIVATE=1           — дотоод сүлжээний (localhost, 10.x …) сайтыг шалгахыг зөвшөөрөх
 *   HJ_CORS_ORIGIN=https://...   — өөр домэйноос API дуудах
 *   HJ_KEEP_SCANS=50             — сайт бүрт хадгалах сканы тоо
 */
import http from 'node:http';
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { createQueue } from './queue.js';
import { createApp } from './app.js';

export function loadConfig(env = process.env, overrides = {}) {
  return {
    port: +(env.PORT || 8080),
    host: env.HOST || '0.0.0.0',
    dbFile: env.HJ_DB || './data/hurteemj.db',
    concurrency: Math.max(1, +(env.HJ_CONCURRENCY || 2)),
    maxPages: Math.max(1, Math.min(200, +(env.HJ_MAX_PAGES || 50))),
    pageTimeout: +(env.HJ_PAGE_TIMEOUT || 60000),
    allowPrivate: env.HJ_ALLOW_PRIVATE === '1' || env.HJ_ALLOW_PRIVATE === 'true',
    publicUrl: (env.HJ_PUBLIC_URL || '').replace(/\/$/, ''),
    webhookSecret: env.HJ_WEBHOOK_SECRET || null,
    corsOrigin: env.HJ_CORS_ORIGIN || null,
    keepScans: +(env.HJ_KEEP_SCANS || 50),
    adminKey: env.HJ_ADMIN_KEY || null,
    log: console,
    ...overrides,
  };
}

/** Серверийг эхлүүлнэ (тестэд ашиглагдана). port: 0 = санамсаргүй сул порт */
export async function startServer(overrides = {}) {
  const config = loadConfig(process.env, overrides);
  const db = openDb(config.dbFile);
  if (config.adminKey) db.importKey('admin (HJ_ADMIN_KEY)', config.adminKey);
  let bootstrapKey = null;
  if (db.activeKeyCount() === 0) {
    bootstrapKey = db.createKey('admin').key;
    if (!config.quiet) {
      console.log('\n  Анхны админ API түлхүүр (зөвхөн одоо харагдана, хадгалж аваарай):');
      console.log(`  ${bootstrapKey}\n`);
    }
  }
  const queue = createQueue({ db, config });
  const handler = createApp({ db, queue, config });
  const server = http.createServer(handler);
  server.requestTimeout = 30_000;
  await new Promise((resolve) => server.listen(config.port, config.host, resolve));
  queue.start();
  const { port } = server.address();
  if (!config.quiet) console.log(`hurteemj scanner: http://localhost:${port}  (db: ${config.dbFile}, concurrency: ${config.concurrency})`);
  return {
    server, db, queue, config, port, bootstrapKey,
    async close() {
      await queue.stop();
      await new Promise((r) => server.close(r));
      server.closeAllConnections?.();
      db.close();
    },
  };
}

async function cli(argv) {
  if (argv[0] === 'keys') {
    const config = loadConfig();
    const db = openDb(config.dbFile);
    if (argv[1] === 'create') {
      const k = db.createKey(argv[2] || 'key');
      db.log(null, 'key.create', String(k.id), { name: k.name, via: 'cli' });
      console.log(k.key);
    } else if (argv[1] === 'revoke') {
      console.log(db.revokeKey(+argv[2]) ? 'revoked' : 'not found');
    } else {
      console.table(db.listKeys());
    }
    db.close();
    return;
  }
  const app = await startServer();
  const shutdown = async () => { await app.close(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// `npx hurteemj-scanner` (symlink) болон `node server/index.js` хоёуланд ажиллана
const isMain = (() => { try { return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) cli(process.argv.slice(2));
