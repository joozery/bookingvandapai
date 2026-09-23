import { randomUUID } from 'node:crypto';

/** Only scalar, explicitly selected fields enter these structured server logs. */
export function createMessengerLogger(redactions: string[]) {
  const requestId = randomUUID();
  return (stage: string, fields: Record<string, unknown> = {}, level: 'info' | 'error' = 'info') => {
    const clean: Record<string, string | number | boolean | null> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === 'string') {
        let text = value;
        for (const secret of redactions.filter(Boolean).sort((a, b) => b.length - a.length)) {
          for (const form of [secret, encodeURIComponent(secret)]) text = text.split(form).join('[REDACTED]');
        }
        text = text.replace(/Bearer\s+[^\s"',]+/gi, 'Bearer [REDACTED]')
          .replace(/\bEAA[A-Za-z0-9]+/g, '[REDACTED]')
          .replace(/https?:\/\/[^\s"']+/gi, '[URL REDACTED]');
        clean[key] = text.slice(0, 1000);
      } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
        clean[key] = value;
      }
    }
    console[level](JSON.stringify({ timestamp: new Date().toISOString(), scope: 'messenger_webhook', requestId, stage, ...clean }));
  };
}

export function safeErrorFields(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== 'object') return {};
  const source = error as Record<string, unknown>;
  return Object.fromEntries(['name', 'message', 'type', 'code', 'error_subcode', 'fbtrace_id'].map(key => [key, source[key]]));
}
