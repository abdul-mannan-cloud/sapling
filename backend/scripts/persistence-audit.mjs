import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
const report = JSON.parse(readFileSync('audit-offline-results.json', 'utf8'));
const db = new PrismaClient({ datasourceUrl: `file:${report.database}` });
const conversation = await db.conversation.findFirst({ where: { patientId: 'pt_001' } });
const before = await db.message.count({ where: { conversationId: conversation.id } });
await db.$disconnect();
const env = { ...process.env, DATABASE_URL: `file:${report.database}`, JWT_SECRET: 'isolated-audit-secret', PORT: '3197', OPENAI_API_KEY: '', DEEPGRAM_API_KEY: '' };
async function start() {
 const child = spawn(process.execPath, ['dist/main.js'], { env, stdio: 'ignore' });
 for (let i = 0; i < 80; i++) {
  if (child.exitCode !== null) throw new Error('Test server exited before starting');
  try { await fetch('http://127.0.0.1:3197/'); return child; } catch { await new Promise((r) => setTimeout(r, 100)); }
 }
 child.kill(); throw new Error('Test server start timeout');
}
async function stop(child) { child.kill('SIGTERM'); await once(child, 'exit'); }
let child;
try {
 child = await start();
 const login = await fetch('http://127.0.0.1:3197/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'alex', password: 'audit-patient' }) }).then((r) => r.json());
 assert.ok(login.token);
 await stop(child); child = null;
 child = await start();
 const response = await fetch(`http://127.0.0.1:3197/conversations/${conversation.id}/messages`, { headers: { Authorization: `Bearer ${login.token}` } });
 assert.equal(response.status, 200);
 const history = await response.json();
 assert.equal(history.length, before);
 const requests = await fetch('http://127.0.0.1:3197/my-requests', { headers: { Authorization: `Bearer ${login.token}` } }).then((r) => r.json());
 assert.ok(requests.length > 0);
 const result = { pass: true, messagesBefore: before, messagesAfter: history.length, savedRequestsAfterRestart: requests.length, tokenStillValid: true, database: report.database };
 writeFileSync('persistence-audit-results.json', JSON.stringify(result, null, 2));
 console.log(JSON.stringify(result));
} finally { if (child) await stop(child); }
