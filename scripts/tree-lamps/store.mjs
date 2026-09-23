import { DatabaseSync } from 'node:sqlite';

export function eveningAt(now) {
  const singapore = new Date(now.getTime() + 8 * 3600000);
  const hour = singapore.getUTCHours();
  const active = hour >= 18 || hour < 6;
  const date = singapore.toISOString().slice(0, 10);
  const start = new Date(`${date}T10:00:00.000Z`);
  if (hour < 6) start.setUTCDate(start.getUTCDate() - 1);
  const next = active ? new Date(start.getTime() + 12 * 3600000) : start;
  return { night: start.toISOString().slice(0, 10), active, serverNow: now.toISOString(), nextChangeAt: next.toISOString() };
}

/** SQLite serializes each write transaction across every connection to this file. */
export function openLampStore(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS tree_lights (
      namespace TEXT NOT NULL, night TEXT NOT NULL, visitor_hash TEXT NOT NULL,
      lamp INTEGER NOT NULL CHECK (lamp BETWEEN 0 AND 5), lit_at TEXT NOT NULL,
      PRIMARY KEY (namespace, night, visitor_hash), UNIQUE(namespace, night, lamp)
    );`);
  const rows = db.prepare('SELECT lamp, visitor_hash FROM tree_lights WHERE namespace = ? AND night = ? ORDER BY lamp');
  const insert = db.prepare('INSERT INTO tree_lights VALUES (?, ?, ?, ?, ?)');
  function state(namespace, visitorHash, now, lampIndex = null) {
    const evening = eveningAt(now);
    const writing = lampIndex !== null;
    if (writing && (!Number.isInteger(lampIndex) || lampIndex < 0 || lampIndex > 5)) throw new RangeError('invalid_lamp');
    if (writing) db.exec('BEGIN IMMEDIATE');
    try {
      let entries = evening.active ? rows.all(namespace, evening.night) : [];
      let own = entries.find(row => row.visitor_hash === visitorHash);
      let outcome = 'state';
      if (writing) {
        outcome = !evening.active ? 'daytime' : own ? 'already' : entries.length >= 6 ? 'full'
          : entries.some(row => row.lamp === lampIndex) ? 'occupied' : 'lit';
        if (outcome === 'lit') {
          insert.run(namespace, evening.night, visitorHash, lampIndex, now.toISOString());
          entries = rows.all(namespace, evening.night);
          own = entries.find(row => row.visitor_hash === visitorHash);
        }
      }
      const result = { namespace, ...evening, lights: entries.map(row => Number(row.lamp)),
        contributed: Boolean(own), yourLamp: own ? Number(own.lamp) : null,
        accepted: outcome === 'lit', outcome, source: 'shared-preview-sqlite' };
      if (writing) db.exec('COMMIT');
      return result;
    } catch (error) {
      if (writing) db.exec('ROLLBACK');
      throw error;
    }
  }
  return { state, close: () => db.close() };
}
