import { Router } from 'express';
import { secretsMatch } from '../utils/security.js';

export function createGraphRouter({ clientState }) {
  const router = Router();

  router.post('/notifications', (request, response) => {
    const validationToken = request.query.validationToken;
    if (typeof validationToken === 'string') {
      return response.status(200).type('text/plain').send(validationToken);
    }

    if (!clientState) return response.status(503).json({ error: 'GRAPH_CLIENT_STATE is not configured.' });

    const notifications = Array.isArray(request.body?.value) ? request.body.value : [];
    if (!notifications.length) {
      return response.status(400).json({ error: 'Expected a Microsoft Graph notification collection.' });
    }

    if (notifications.some((notification) => !secretsMatch(notification?.clientState, clientState))) {
      return response.sendStatus(401);
    }

    // Graph expects a fast acknowledgement. Standard notifications contain message IDs;
    // production mailbox processing should queue them for a separate worker to fetch.
    return response.status(202).json({ accepted: notifications.length });
  });

  return router;
}
