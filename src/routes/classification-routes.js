import { Router } from 'express';
import { EmailSchema } from '../schemas.js';
import { secretsMatch } from '../utils/security.js';

function parseEmail(payload) {
  const result = EmailSchema.safeParse(payload);
  if (!result.success || (!result.data.subject.trim() && !result.data.body.trim())) return null;
  return result.data;
}

function sendClassifierError(response, error) {
  const message = error instanceof Error ? error.message : 'Classification failed.';
  return response.status(502).json({ error: message });
}

export function createClassificationRouter({ classifier, emailIngestApiKey, store }) {
  const router = Router();

  router.post('/classify', async (request, response) => {
    const email = parseEmail(request.body);
    if (!email) return response.status(400).json({ error: 'Enter a subject or message body.' });

    try {
      return response.json(await classifier.classify(email));
    } catch (error) {
      return sendClassifierError(response, error);
    }
  });

  // This endpoint receives full email content from a trusted Azure workflow.
  router.post('/email/classify', async (request, response) => {
    if (!emailIngestApiKey) return response.status(503).json({ error: 'EMAIL_INGEST_API_KEY is not configured.' });
    if (!secretsMatch(request.get('x-api-key'), emailIngestApiKey)) return response.sendStatus(401);

    const email = parseEmail(request.body);
    if (!email) return response.status(400).json({ error: 'Payload must contain a subject or body.' });

    try {
      const classification = await classifier.classify(email);
      await store.record({ email, classification });
      return response.json(classification);
    } catch (error) {
      return sendClassifierError(response, error);
    }
  });

  router.get('/email/classifications', async (request, response) => {
    const requestedLimit = Number(request.query.limit);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;

    try {
      return response.json({ items: await store.list(limit), storage: store.mode });
    } catch {
      return response.status(503).json({ error: 'Automatic classifications are temporarily unavailable.' });
    }
  });

  return router;
}
