import axios from 'axios';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { WebhookLog } from '../models/WebhookLog.js';

const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 5000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const sign = (body) => crypto.createHmac('sha256', env.n8n.webhookSecret).update(body).digest('hex');

// `data` is what is actually sent. For sensitive events it is passed in memory,
// because the copy stored in the log has the secret fields redacted.
async function deliver(log, data = log.payload) {
  for (let attempt = log.attempts + 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const body = JSON.stringify({
      id: String(log._id), // stable id => n8n can de-duplicate retries (idempotency)
      event: log.event,
      data,
      sentAt: new Date().toISOString(),
    });
    try {
      const res = await axios.post(env.n8n.webhookUrl, body, {
        timeout: TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': env.n8n.webhookSecret,
          'x-webhook-signature': sign(body),
          'x-webhook-event': log.event,
          'x-webhook-id': String(log._id),
        },
      });
      log.set({ status: 'success', attempts: attempt, responseStatus: res.status, lastError: undefined });
      await log.save();
      return log;
    } catch (err) {
      log.set({
        status: 'failed',
        attempts: attempt,
        responseStatus: err.response?.status,
        lastError: err.message,
      });
      await log.save();
      if (attempt < MAX_ATTEMPTS) await sleep(1000 * 2 ** (attempt - 1)); // 1s, 2s
    }
  }
  return log;
}

/**
 * Fire-and-forget: NEVER await this in a controller and it NEVER throws.
 * If n8n is down the user's request must still succeed; the failure is kept in
 * WebhookLog and can be replayed from the admin API.
 *
 * options.sensitive + options.redact: fields listed in `redact` (e.g. ['code']) are
 * sent to n8n but stored as "[redacted]" in the log, and the event is never replayed.
 */
export function emitEvent(event, data, options) {
  console.log(`[webhook] Dispatching: ${event}`);
  console.log('[webhook] URL configured:', Boolean(env.n8n.webhookUrl));

  return sendWebhook(event, data, options)
    .then((result) => {
      console.log(`[webhook] Result: ${result.status}`);
      return result;
    })
    .catch((err) => {
      console.error(`[webhook] ${event} failed:`, err);
      return null;
    });
}

export async function sendWebhook(event, data, { sensitive = false, redact = [] } = {}) {
  const plain = JSON.parse(JSON.stringify(data)); // plain JSON (ObjectIds -> strings)
  const stored = { ...plain };
  for (const key of redact) if (key in stored) stored[key] = '[redacted]';

  const log = await WebhookLog.create({
    event,
    payload: stored,
    sensitive,
    status: env.n8n.webhookUrl ? 'pending' : 'skipped',
  });
  if (!env.n8n.webhookUrl) return log;
  return deliver(log, plain);
}

export async function retryFailedWebhooks(limit = 50) {
  if (!env.n8n.webhookUrl) return { retried: 0, succeeded: 0 };
  // sensitive events (reset codes) are not replayed: the code has expired anyway
  const logs = await WebhookLog.find({ status: 'failed', sensitive: { $ne: true } })
    .sort({ createdAt: 1 })
    .limit(limit);
  let succeeded = 0;
  for (const log of logs) {
    log.attempts = 0;
    await deliver(log);
    if (log.status === 'success') succeeded++;
  }
  return { retried: logs.length, succeeded };
}