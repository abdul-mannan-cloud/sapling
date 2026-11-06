import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { AgentService, protectPendingAppointments } from '../dist/agent/agent.service.js';
import { RuleAgentService } from '../dist/agent/rule-agent.service.js';
import { isEmergency } from '../dist/agent/emergency.js';
const patient = JSON.parse(readFileSync('src/data/alex_morgan.json'));
const message = { id: 'm1', sender: 'patient', body: 'hello', createdAt: '' };
const ctx = { conversationId: 'c1', nowIso: '2026-11-04T10:00:00-08:00', nowDescription: 'Wednesday', patient, openSlots: JSON.parse(readFileSync('src/data/open_slots.json')), faqText: readFileSync('src/data/clinic_faq.md', 'utf8'), history: [message], handoffs: [], currentMessage: message };
const results = [];
async function check(name, fn) { try { await fn(); results.push({ name, pass: true }); } catch (e) { results.push({ name, pass: false, detail: e.message }); } }
await check('Missing API key uses offline agent', async () => { const service = new AgentService(new RuleAgentService(), { isConfigured: () => false }, { isForced: async () => false }); assert.equal((await service.handle(ctx)).mode, 'rule'); });
await check('Hosted model outage falls back to offline', async () => { const service = new AgentService(new RuleAgentService(), { isConfigured: () => true, run: async () => { throw new Error('simulated unavailable model'); } }, { isForced: async () => false }); assert.equal((await service.handle(ctx)).mode, 'rule'); });
await check('Safety detector catches speech-style pain in chest', () => assert.equal(isEmergency('I have pain in my chest and my left arm is tingling'), true));
await check('Negative consent never bypasses duplicate guard', () => {
 const c = structuredClone(ctx); c.currentMessage.body = 'yes to the existing one, no additional appointment';
 c.history = [{ id: 'a', sender: 'agent', body: 'Do you still want an additional appointment request?', createdAt: '' }];
 c.handoffs = [{ id: 'h1', type: 'appointment_request', status: 'pending_staff', details: { date: '2026-11-10' } }];
 const result = protectPendingAppointments(c, { mode: 'llm', reply: 'Saved', handoffAction: { operation: 'create', type: 'appointment_request', details: { date: '2026-11-12' } } });
 assert.equal(result.handoffAction, undefined);
});
writeFileSync('offline-probe-results.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
