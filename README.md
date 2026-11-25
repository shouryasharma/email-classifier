# Trade Process Optimization Email Classifier

A Node.js, Express, and EJS app that classifies Trade Process Optimization email issues as
`technical` or `management`, with priority, confidence, summary, evidence, and action items.

## Run locally

```bash
cp .env.example .env.local
# Set the required values in .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## HTTP endpoints

| Route | Purpose |
| --- | --- |
| `GET /healthz` | Azure health check endpoint. |
| `POST /api/classify` | Browser playground classification. |
| `POST /api/email/classify` | Secured endpoint for a trusted Azure workflow that posts full email content. Send `x-api-key: EMAIL_INGEST_API_KEY`. |
| `POST /api/graph/notifications` | Microsoft Graph subscription validation and change-notification acknowledgement. |

`POST /api/email/classify` accepts:

```json
{
  "sender": "trader@example.com",
  "subject": "Settlement queue is stuck",
  "body": "The exception queue has not refreshed since 09:30."
}
```

## Azure App Service deployment

Deploy this repository root as a Linux Node.js App Service. The server already uses Azure's
`PORT` environment variable.

1. Create an App Service with a current Node.js LTS runtime.
2. Add these **Application settings** in Azure; do not deploy `.env.local`:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL` (optional)
   - `EMAIL_INGEST_API_KEY`
   - `GRAPH_CLIENT_STATE`
   - `SCM_DO_BUILD_DURING_DEPLOYMENT=true`
3. Set the startup command to `npm start` if the portal does not detect it automatically.
4. Deploy the repository root (including `package.json` and `package-lock.json`, excluding
   `node_modules` and `.env.local`).
5. Confirm `https://<app-name>.azurewebsites.net/healthz` returns `{ "status": "ok" }`.

## Microsoft Graph setup

Use this notification URL when creating the Graph subscription:

```text
https://<app-name>.azurewebsites.net/api/graph/notifications
```

Set the Graph subscription's `clientState` to the same secret as `GRAPH_CLIENT_STATE`.
Microsoft Graph validates this URL by posting a `validationToken`; the app returns that token as
required plain text. Standard Graph notifications contain message IDs rather than the full email,
so use an Azure Logic App/Function or queue worker to fetch the message from Graph and post the
normalized `sender`, `subject`, and `body` payload to `/api/email/classify`.

Structured model output is used to constrain the classification schema, and OpenAI response
storage is disabled with `store: false`.

## Project layout

- `server.js` — Express application entry point
- `src/services/` — LLM classification service
- `src/routes/` — classification and Microsoft Graph API routes
- `src/utils/` — security helpers
- `views/` — EJS templates
- `public/` — browser JavaScript and styles
