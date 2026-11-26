const samples = {
  'import-error': { sender: 'priya.shah@northstartrading.com', subject: 'CSV import fails after the mapping step', body: 'The Trade Process Optimization import gets to 92%, then shows “Unable to validate settlement date”. We used the same CSV successfully last week. Please check the validation error and let us know how to complete today’s upload.' },
  'slow-dashboard': { sender: 'sam.lee@harbortrades.com', subject: 'Exception dashboard takes over a minute to load', body: 'Since this morning, the Exception dashboard spins for 70–90 seconds whenever I filter by EMEA and this quarter. The rest of the app is responsive. Could you investigate the dashboard performance?' },
  'approval-policy': { sender: 'morgan.chen@northstartrading.com', subject: 'Need a second approval for high-value trade exceptions', body: 'We need any exception above $500,000 to require sign-off from both Compliance and the desk lead before it can be released. Can you help us update the approval policy before next Monday?' },
  'workflow-owner': { sender: 'alex.rivera@harbortrades.com', subject: 'Reassigning the failed-settlement queue owner', body: 'Jordan has moved to Operations, so please assign Priya as the owner of the failed-settlement queue and make sure weekly queue reporting goes to her. What is the approval process for this change?' },
};

const categoryLabels = { technical: 'Technical', management: 'Management' };
const form = document.querySelector('#email-form');
const sender = document.querySelector('#sender');
const subject = document.querySelector('#subject');
const body = document.querySelector('#body');
const count = document.querySelector('#word-count');
const classifyButton = document.querySelector('#classify-button');
const toggleJson = document.querySelector('#toggle-json');
const readout = document.querySelector('#readout');
const jsonView = document.querySelector('#json-view');
const manualStates = ['empty-state', 'loading-state', 'error-state', 'readout', 'json-view']
  .map((id) => document.querySelector(`#${id}`));
const views = { manual: document.querySelector('#manual-view'), automatic: document.querySelector('#automatic-view') };
let latestResult;
let displayingJson = false;
let refreshTimer;

function escapeHTML(value) {
  const element = document.createElement('div');
  element.textContent = value || '';
  return element.innerHTML;
}

function updateWordCount() {
  count.textContent = `${body.value.trim().split(/\s+/).filter(Boolean).length} words`;
}

function showManualState(id) {
  manualStates.forEach((element) => element.classList.toggle('hidden', element.id !== id));
}

function renderReadout(result) {
  latestResult = result;
  displayingJson = false;
  toggleJson.classList.remove('hidden');
  toggleJson.textContent = '{ } JSON';
  readout.innerHTML = `
    <div class="verdict"><div><span class="priority ${escapeHTML(result.priority)}">${escapeHTML(result.priority)} priority</span><h3>${escapeHTML(categoryLabels[result.category] || result.category)}</h3></div><div class="confidence"><strong>${Math.round(result.confidence * 100)}%</strong><span>confidence</span></div></div>
    <div class="meter"><span style="width:${Math.max(0, Math.min(100, result.confidence * 100))}%"></span></div>
    <article class="summary"><span>IN ONE LINE</span><p>${escapeHTML(result.summary)}</p></article>
    <article><span>WHY THIS LABEL</span><ul>${result.reasons.map((reason) => `<li>${escapeHTML(reason)}</li>`).join('')}</ul></article>
    <article><span>ACTION ITEMS</span>${result.action_items.length ? `<ul>${result.action_items.map((item) => `<li>${escapeHTML(item)}</li>`).join('')}</ul>` : '<p class="muted">No explicit action requested.</p>'}</article>
    <footer><span>Provider: ${escapeHTML(result.provider)}</span><span>Model: ${escapeHTML(result.model)}</span></footer>`;
  showManualState('readout');
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function renderAutomaticClassifications(items, storage) {
  const loading = document.querySelector('#automatic-loading');
  const error = document.querySelector('#automatic-error');
  const empty = document.querySelector('#automatic-empty');
  const list = document.querySelector('#classification-list');
  const note = document.querySelector('#storage-note');

  loading.classList.add('hidden');
  error.classList.add('hidden');
  note.textContent = storage === 'sqlite'
    ? 'Stored in the local SQLite database.'
    : 'Automatic classification storage is unavailable.';

  if (!items.length) {
    empty.classList.remove('hidden');
    list.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  list.classList.remove('hidden');
  list.innerHTML = items.map((item) => `
    <article class="classification-card">
      <div class="card-topline"><span class="category ${escapeHTML(item.category)}">${escapeHTML(categoryLabels[item.category] || item.category)}</span><time>${escapeHTML(formatDate(item.receivedAt))}</time></div>
      <h2>${escapeHTML(item.subject || 'No subject')}</h2>
      <p class="sender">${escapeHTML(item.sender || 'Unknown sender')}</p>
      <p class="card-summary">${escapeHTML(item.summary)}</p>
      <div class="card-footer"><span class="priority ${escapeHTML(item.priority)}">${escapeHTML(item.priority)} priority</span><span>${Math.round(item.confidence * 100)}% confidence</span></div>
    </article>`).join('');
}

async function loadAutomaticClassifications() {
  const loading = document.querySelector('#automatic-loading');
  const error = document.querySelector('#automatic-error');
  loading.classList.remove('hidden');
  error.classList.add('hidden');

  try {
    const response = await fetch('/api/email/classifications?limit=50');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Unable to load automatic classifications.');
    renderAutomaticClassifications(payload.items, payload.storage);
  } catch (caught) {
    loading.classList.add('hidden');
    error.textContent = caught instanceof Error ? caught.message : 'Unable to load automatic classifications.';
    error.classList.remove('hidden');
  }
}

function selectView(name) {
  Object.entries(views).forEach(([view, element]) => element.classList.toggle('hidden', view !== name));
  document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === name));
  window.clearInterval(refreshTimer);
  if (name === 'automatic') {
    loadAutomaticClassifications();
    refreshTimer = window.setInterval(loadAutomaticClassifications, 15_000);
  }
}

document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => selectView(button.dataset.view)));
document.querySelector('#refresh-classifications').addEventListener('click', loadAutomaticClassifications);
document.querySelectorAll('[data-sample]').forEach((button) => button.addEventListener('click', () => {
  const sample = samples[button.dataset.sample];
  sender.value = sample.sender;
  subject.value = sample.subject;
  body.value = sample.body;
  updateWordCount();
  toggleJson.classList.add('hidden');
  showManualState('empty-state');
}));
document.querySelector('#clear-form').addEventListener('click', () => {
  sender.value = '';
  subject.value = '';
  body.value = '';
  updateWordCount();
  toggleJson.classList.add('hidden');
  showManualState('empty-state');
});
body.addEventListener('input', updateWordCount);
toggleJson.addEventListener('click', () => {
  displayingJson = !displayingJson;
  toggleJson.textContent = displayingJson ? 'Summary' : '{ } JSON';
  if (displayingJson) {
    jsonView.textContent = JSON.stringify(latestResult, null, 2);
    showManualState('json-view');
  } else {
    showManualState('readout');
  }
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  classifyButton.disabled = true;
  classifyButton.querySelector('span').textContent = 'Reading between the lines…';
  showManualState('loading-state');

  try {
    const response = await fetch('/api/classify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sender: sender.value, subject: subject.value, body: body.value }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Classification failed');
    renderReadout(result);
  } catch (error) {
    document.querySelector('#error-message').textContent = error.message || 'Classification failed';
    toggleJson.classList.add('hidden');
    showManualState('error-state');
  } finally {
    classifyButton.disabled = false;
    classifyButton.querySelector('span').textContent = 'Classify email';
  }
});

updateWordCount();
