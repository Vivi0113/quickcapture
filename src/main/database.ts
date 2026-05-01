import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import log from 'electron-log'

let db: Database.Database | null = null

export interface Question {
  id: number
  question: string
  app_name: string | null
  window_title: string | null
  screenshot_path: string | null
  ocr_text: string | null
  status: 'pending' | 'resolved' | 'snoozed'
  resolve_note: string | null
  ai_response: string | null
  created_at: string
  resolved_at: string | null
}

export interface QuestionListOptions {
  status?: 'pending' | 'resolved' | 'snoozed' | 'all'
  search?: string
  dateRange?: 'today' | 'week' | 'all'
  appName?: string
}

export function initDatabase(): void {
  const dbPath = path.join(app.getPath('userData'), 'quickcapture.db')
  log.info(`[Database] Initializing at ${dbPath}`)

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')

  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      question      TEXT NOT NULL,
      app_name      TEXT,
      window_title  TEXT,
      screenshot_path TEXT,
      ocr_text      TEXT,
      status        TEXT NOT NULL DEFAULT 'pending',
      resolve_note  TEXT,
      ai_response   TEXT,
      created_at    DATETIME NOT NULL DEFAULT (datetime('now')),
      resolved_at   DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);
    CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at);
    CREATE INDEX IF NOT EXISTS idx_questions_app_name ON questions(app_name);

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  log.info('[Database] Initialized successfully')
}

export function createQuestion(question: string, appName: string | null, windowTitle: string | null, screenshotPath: string | null): Question {
  if (!db) throw new Error('Database not initialized')

  const stmt = db.prepare(`
    INSERT INTO questions (question, app_name, window_title, screenshot_path)
    VALUES (?, ?, ?, ?)
  `)

  const result = stmt.run(question, appName, windowTitle, screenshotPath)
  return getQuestionById(result.lastInsertRowid as number)!
}

export function getQuestionById(id: number): Question | null {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('SELECT * FROM questions WHERE id = ?')
  return stmt.get(id) as Question | null
}

export function getQuestions(options: QuestionListOptions = {}): Question[] {
  if (!db) throw new Error('Database not initialized')

  let sql = 'SELECT * FROM questions WHERE 1=1'
  const params: (string | number)[] = []

  if (options.status && options.status !== 'all') {
    sql += ' AND status = ?'
    params.push(options.status)
  }

  if (options.search) {
    sql += ' AND (question LIKE ? OR ocr_text LIKE ?)'
    const searchPattern = `%${options.search}%`
    params.push(searchPattern, searchPattern)
  }

  if (options.dateRange) {
    const now = new Date()
    if (options.dateRange === 'today') {
      sql += " AND date(created_at) = date('now')"
    } else if (options.dateRange === 'week') {
      sql += " AND created_at >= datetime('now', '-7 days')"
    }
  }

  if (options.appName) {
    sql += ' AND app_name = ?'
    params.push(options.appName)
  }

  sql += ' ORDER BY created_at DESC'

  const stmt = db.prepare(sql)
  return stmt.all(...params) as Question[]
}

export function updateQuestion(id: number, updates: Partial<Pick<Question, 'status' | 'resolve_note' | 'ai_response' | 'ocr_text'>>): boolean {
  if (!db) throw new Error('Database not initialized')

  const fields: string[] = []
  const values: (string | null)[] = []

  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
    if (updates.status === 'resolved') {
      fields.push("resolved_at = datetime('now')")
    }
  }

  if (updates.resolve_note !== undefined) {
    fields.push('resolve_note = ?')
    values.push(updates.resolve_note)
  }

  if (updates.ai_response !== undefined) {
    fields.push('ai_response = ?')
    values.push(updates.ai_response)
  }

  if (updates.ocr_text !== undefined) {
    fields.push('ocr_text = ?')
    values.push(updates.ocr_text)
  }

  if (fields.length === 0) return false

  values.push(id.toString())
  const stmt = db.prepare(`UPDATE questions SET ${fields.join(', ')} WHERE id = ?`)
  const result = stmt.run(...values)
  return result.changes > 0
}

export function deleteQuestion(id: number): boolean {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('DELETE FROM questions WHERE id = ?')
  const result = stmt.run(id)
  return result.changes > 0
}

export function getSetting(key: string): string | null {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('SELECT value FROM settings WHERE key = ?')
  const row = stmt.get(key) as { value: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  stmt.run(key, value)
}

export function getAppNames(): string[] {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare("SELECT DISTINCT app_name FROM questions WHERE app_name IS NOT NULL AND app_name != ''")
  const rows = stmt.all() as { app_name: string }[]
  return rows.map(r => r.app_name)
}

export function getPendingCount(): number {
  if (!db) throw new Error('Database not initialized')
  const stmt = db.prepare("SELECT COUNT(*) as count FROM questions WHERE status = 'pending'")
  const row = stmt.get() as { count: number }
  return row.count
}

export function getDb(): Database.Database | null {
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
