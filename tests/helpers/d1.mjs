import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function testDb() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../../migrations/0001_portal.sql', import.meta.url), 'utf8'));
  class Statement {
    constructor(sql, params = []) { this.sql = sql; this.params = params; }
    bind(...params) { return new Statement(this.sql, params); }
    execute() {
      const statement = sqlite.prepare(this.sql);
      let results = [];
      if (/^\s*SELECT\b|\bRETURNING\b/i.test(this.sql)) results = statement.all(...this.params);
      else statement.run(...this.params);
      return { results: results.map(row => ({ ...row })), success: true, meta: { changes: Number(sqlite.prepare('SELECT changes() AS n').get().n) } };
    }
    async first(column) { const result = this.execute().results[0] || null; return column && result ? result[column] : result; }
    async all() { return this.execute(); }
    async run() { return this.execute(); }
  }
  return {
    prepare: sql => new Statement(sql),
    async batch(statements) { sqlite.exec('BEGIN'); try { const results = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return results; } catch (error) { sqlite.exec('ROLLBACK'); throw error; } },
    async exec(sql) { sqlite.exec(sql); },
    close: () => sqlite.close(),
  };
}
