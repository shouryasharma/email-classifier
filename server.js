import express from 'express';
import { config } from './src/config.js';
import { createClassificationRouter } from './src/routes/classification-routes.js';
import { createGraphRouter } from './src/routes/graph-routes.js';
import { EmailClassifier } from './src/services/email-classifier.js';
import { ClassificationStore } from './src/services/classification-store.js';

const app = express();
const classifier = new EmailClassifier({
  apiKey: config.openaiApiKey,
  model: config.openaiModel,
});
const store = new ClassificationStore({
  databasePath: config.sqliteDatabasePath,
});

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.json({ limit: '100kb' }));
app.use(express.static('public'));

app.get('/', (_request, response) => response.render('index', { model: config.openaiModel }));
app.get('/healthz', (_request, response) => response.status(200).json({ status: 'ok' }));
app.use('/api', createClassificationRouter({ classifier, emailIngestApiKey: config.emailIngestApiKey, store }));
app.use('/api/graph', createGraphRouter({ clientState: config.graphClientState }));

app.listen(config.port, () => {
  console.log(`Mailroom is running at http://localhost:${config.port}`);
});
