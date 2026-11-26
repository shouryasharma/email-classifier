import crypto from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

function parseList(value) {
  try {
    return JSON.parse(value || '[]');
  } catch {
    return [];
  }
}

function toRecord(row) {
  return {
    id: row.id,
    source: row.source,
    sender: row.sender,
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    confidence: row.confidence,
    summary: row.summary,
    reasons: parseList(row.reasons),
    actionItems: parseList(row.action_items),
    receivedAt: row.received_at,
  };
}

export class ClassificationStore {
  constructor({ databasePath }) {
    mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec('PRAGMA journal_mode = WAL;');
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS classifications (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        sender TEXT NOT NULL,
        subject TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        confidence REAL NOT NULL,
        summary TEXT NOT NULL,
        reasons TEXT NOT NULL,
        action_items TEXT NOT NULL,
        received_at TEXT NOT NULL
      )
    `);
    this.insert = this.database.prepare(`
      INSERT INTO classifications (
        id, source, sender, subject, category, priority, confidence,
        summary, reasons, action_items, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.listLatest = this.database.prepare(`
      SELECT * FROM classifications ORDER BY received_at DESC LIMIT ?
    `);
  }

  get mode() {
    return 'sqlite';
  }

  record({ email, classification }) {
    const record = {
      id: crypto.randomUUID(),
      source: 'automation',
      sender: email.sender,
      subject: email.subject,
      category: classification.category,
      priority: classification.priority,
      confidence: classification.confidence,
      summary: classification.summary,
      reasons: classification.reasons,
      actionItems: classification.action_items,
      receivedAt: new Date().toISOString(),
    };

    this.insert.run(
      record.id,
      record.source,
      record.sender,
      record.subject,
      record.category,
      record.priority,
      record.confidence,
      record.summary,
      JSON.stringify(record.reasons),
      JSON.stringify(record.actionItems),
      record.receivedAt,
    );
    return record;
  }

  list(limit = 50) {
    return this.listLatest.all(limit).map(toRecord);
  }
}
