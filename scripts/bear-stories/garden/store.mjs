import { DatabaseSync } from 'node:sqlite';

const dateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function stageForWaterings(total) {
  if (total >= 6) return 'bloom';
  if (total >= 3) return 'bud';
  if (total >= 1) return 'sprout';
  return 'seed';
}

/** One synchronous SQLite transaction is the daily idempotency boundary. */
export function openGardenStore(filename) {
  const database = new DatabaseSync(filename);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 3000;
    CREATE TABLE IF NOT EXISTS garden_waterings (
      namespace TEXT NOT NULL,
      visitor_hash TEXT NOT NULL,
      garden_day TEXT NOT NULL,
      watered_at TEXT NOT NULL,
      PRIMARY KEY (namespace, visitor_hash, garden_day)
    );
  `);
  const count = database.prepare(`SELECT COUNT(*) AS total, MAX(watered_at) AS updated
    FROM garden_waterings WHERE namespace = ?`);
  const visited = database.prepare(`SELECT 1 FROM garden_waterings
    WHERE namespace = ? AND visitor_hash = ? AND garden_day = ?`);
  const insert = database.prepare(`INSERT INTO garden_waterings
    (namespace, visitor_hash, garden_day, watered_at) VALUES (?, ?, ?, ?)
    ON CONFLICT (namespace, visitor_hash, garden_day) DO NOTHING`);
  let closed = false;

  function read(namespace, visitorHash, now) {
    const today = dateFormat.format(now);
    const aggregate = count.get(namespace);
    const totalWaterings = Number(aggregate.total);
    return {
      namespace, today, totalWaterings,
      stage: stageForWaterings(totalWaterings),
      wateredToday: Boolean(visited.get(namespace, visitorHash, today)),
      updatedAt: aggregate.updated ?? null,
      source: 'shared-preview-sqlite',
    };
  }

  function water(namespace, visitorHash, now) {
    database.exec('BEGIN IMMEDIATE');
    try {
      const saved = insert.run(namespace, visitorHash, dateFormat.format(now), now.toISOString());
      const result = { ...read(namespace, visitorHash, now), accepted: saved.changes === 1 };
      database.exec('COMMIT');
      return result;
    } catch (error) {
      database.exec('ROLLBACK');
      throw error;
    }
  }

  return {
    read, water,
    close() {
      if (!closed) database.close();
      closed = true;
    },
  };
}
