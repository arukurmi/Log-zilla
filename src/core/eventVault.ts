import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { StreamEvent } from './eventBuffer';
import { tokenizeQuery, applyQueryTokens } from './queryEngine';

// Resolve the on-disk database location
const vaultPath = process.env.DB_PATH || path.join(process.cwd(), 'logs.db');

// Open (or create) the vault
const vault = new Database(vaultPath);

// Schema: one row per log event
vault.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    message TEXT NOT NULL,
    level TEXT,
    service TEXT,
    data TEXT -- JSON string for additional log data
  )
`);

// Indexes for the common lookup paths
vault.exec(`
  CREATE INDEX IF NOT EXISTS idx_timestamp ON logs(timestamp);
  CREATE INDEX IF NOT EXISTS idx_level ON logs(level);
  CREATE INDEX IF NOT EXISTS idx_service ON logs(service);
  CREATE INDEX IF NOT EXISTS idx_message ON logs(message);
`);

class EventVault {
  sizeOnDisk(): number {
    try {
      const stats = fs.statSync(vaultPath);
      return stats.size;
    } catch (error) {
      console.error('Error getting database size:', error);
      return 0;
    }
  }

  // Persist an incoming event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  store(raw: any, headers?: Headers): StreamEvent {
    // Ensure the event carries a message property
    const eventMessage =
      raw.message || raw.msg || raw.body || JSON.stringify(raw);

    // Service name can arrive in the payload or as a header
    let serviceName = raw.service || raw.serviceName || raw.service_name;

    if (headers) {
      const headerServiceName = headers.get('service.name');
      if (headerServiceName) {
        serviceName = headerServiceName;
      }
    }

    // Normalize the timestamp to an ISO string, whatever format it arrives in
    let eventTimestamp;
    if (raw.timestamp) {
      if (typeof raw.timestamp === 'number') {
        // Epoch milliseconds
        eventTimestamp = new Date(raw.timestamp).toISOString();
      } else if (typeof raw.timestamp === 'string') {
        if (raw.timestamp.includes('-')) {
          // Already ISO-shaped
          eventTimestamp = raw.timestamp;
        } else {
          // Stringified epoch
          const numTimestamp = parseFloat(raw.timestamp);
          eventTimestamp = new Date(numTimestamp).toISOString();
        }
      } else {
        eventTimestamp = new Date().toISOString();
      }
    } else {
      eventTimestamp = new Date().toISOString();
    }

    // Build the event; the raw payload must not overwrite the normalized fields
    const event: StreamEvent = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      timestamp: eventTimestamp,
      message: eventMessage,
      level: raw.level || raw.severity || 'info',
      service: serviceName || 'system',
    };

    Object.keys(raw).forEach((key) => {
      if (
        key !== 'timestamp' &&
        key !== 'message' &&
        key !== 'level' &&
        key !== 'service'
      ) {
        event[key] = raw[key];
      }
    });

    // Split core columns from the extra data blob
    const {
      id,
      timestamp,
      message: entryMessage,
      level,
      service,
      ...extraData
    } = event;

    const insertStmt = vault.prepare(`
      INSERT INTO logs (id, timestamp, message, level, service, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      id,
      timestamp,
      entryMessage,
      level,
      service,
      JSON.stringify(extraData),
    );

    return event;
  }

  // Queries with key:value / wildcard / negation syntax can't run in SQL
  private isStructuredQuery(query: string): boolean {
    return /[:\-*"]/.test(query);
  }

  // Fetch events with filtering
  fetch(
    filters: {
      query?: string;
      level?: string;
      service?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): StreamEvent[] {
    let sql = `
      SELECT id, timestamp, message, level, service, data
      FROM logs
    `;

    const conditions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    // Level and service always filter at the database level
    if (filters.level) {
      conditions.push('level = ?');
      params.push(filters.level);
    }

    if (filters.service) {
      conditions.push('service = ?');
      params.push(filters.service);
    }

    // Date window
    if (filters.startDate) {
      conditions.push('timestamp >= ?');
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push('timestamp <= ?');
      params.push(filters.endDate);
    }

    // Simple queries filter in SQL; structured queries filter in memory below
    if (filters.query && !this.isStructuredQuery(filters.query)) {
      conditions.push(`(
        message LIKE ? OR
        service LIKE ? OR
        level LIKE ? OR
        data LIKE ?
      )`);
      const queryPattern = `%${filters.query}%`;
      params.push(queryPattern, queryPattern, queryPattern, queryPattern);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Newest first
    sql += ' ORDER BY timestamp DESC';

    // Structured queries need a wider candidate set to filter from
    const effectiveLimit =
      filters.query && this.isStructuredQuery(filters.query)
        ? Math.max(filters.limit || 1000, 5000)
        : filters.limit;

    if (effectiveLimit) {
      sql += ' LIMIT ?';
      params.push(effectiveLimit);

      if (
        filters.offset &&
        (!filters.query || !this.isStructuredQuery(filters.query))
      ) {
        sql += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const stmt = vault.prepare(sql);
    const rows = stmt.all(...params);

    // Re-inflate rows into StreamEvent shape
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let events = rows.map((row: any) => {
      const extraData = JSON.parse(row.data || '{}');
      return {
        id: row.id,
        timestamp: row.timestamp,
        message: row.message,
        level: row.level,
        service: row.service,
        ...extraData,
      } as StreamEvent;
    });

    // In-memory pass for structured queries
    if (filters.query && this.isStructuredQuery(filters.query)) {
      const tokens = tokenizeQuery(filters.query);
      events = applyQueryTokens(events, tokens);

      if (filters.offset) {
        events = events.slice(filters.offset);
      }
      if (filters.limit) {
        events = events.slice(0, filters.limit);
      }
    }

    return events;
  }

  // Distinct severity levels present in the vault
  levels(): string[] {
    const stmt = vault.prepare(
      'SELECT DISTINCT level FROM logs WHERE level IS NOT NULL ORDER BY level',
    );
    const rows = stmt.all();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((row: any) => row.level);
  }

  // Distinct services present in the vault
  services(): string[] {
    const stmt = vault.prepare(
      'SELECT DISTINCT service FROM logs WHERE service IS NOT NULL ORDER BY service',
    );
    const rows = stmt.all();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.map((row: any) => row.service);
  }

  // Delete events, optionally scoped to a service and/or age cutoff
  purge(filters: { service?: string; endDate?: string } = {}): void {
    let sql = 'DELETE FROM logs';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters.service) {
      conditions.push('service = ?');
      params.push(filters.service);
    }

    if (filters.endDate) {
      conditions.push('timestamp < ?');
      params.push(filters.endDate);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const stmt = vault.prepare(sql);
    stmt.run(...params);
  }

  // Count events matching the filters
  count(
    filters: {
      query?: string;
      level?: string;
      service?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): number {
    // Structured queries must be materialized to be counted
    if (filters.query && this.isStructuredQuery(filters.query)) {
      const events = this.fetch({
        ...filters,
        limit: undefined,
        offset: undefined,
      });
      return events.length;
    }

    let sql = 'SELECT COUNT(*) as count FROM logs';

    const conditions: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    if (filters.level) {
      conditions.push('level = ?');
      params.push(filters.level);
    }

    if (filters.service) {
      conditions.push('service = ?');
      params.push(filters.service);
    }

    if (filters.startDate) {
      conditions.push('timestamp >= ?');
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push('timestamp <= ?');
      params.push(filters.endDate);
    }

    if (filters.query) {
      conditions.push(`(
        message LIKE ? OR
        service LIKE ? OR
        level LIKE ? OR
        data LIKE ?
      )`);
      const queryPattern = `%${filters.query}%`;
      params.push(queryPattern, queryPattern, queryPattern, queryPattern);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const stmt = vault.prepare(sql);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }
}

// Shared singleton vault
export const eventVault = new EventVault();

// Graceful shutdown
process.on('exit', () => vault.close());
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
