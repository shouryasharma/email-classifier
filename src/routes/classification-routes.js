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

export function createClassificationRouter({ classifier, emailIngestApiKey }) {
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

  // Use this endpoint when a trusted Azure workflow sends full email content.
  router.post('/email/classify', async (request, response) => {
    if (!emailIngestApiKey) return response.status(503).json({ error: 'EMAIL_INGEST_API_KEY is not configured.' });
    if (!secretsMatch(request.get('x-api-key'), emailIngestApiKey)) return response.sendStatus(401);

    const email = parseEmail(request.body);
    if (!email) return response.status(400).json({ error: 'Payload must contain a subject or body.' });

    try {
      return response.json(await classifier.classify(email));
    } catch (error) {
      return sendClassifierError(response, error);
    }
  });

  return router;
}
