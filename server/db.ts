import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('hub_soberano.db');

// Initialize tables
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS sellers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    commission_rate REAL DEFAULT 0.3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS maletas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_id INTEGER,
    status TEXT DEFAULT 'Disponível', -- 'Disponível', 'Em Campo', 'Finalizada'
    photo_url TEXT,
    total_bruto REAL DEFAULT 0,
    commission_value REAL DEFAULT 0,
    estimated_profit REAL DEFAULT 0,
    delivery_date DATETIME,
    return_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seller_id) REFERENCES sellers(id)
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    maleta_id INTEGER,
    description TEXT,
    price REAL,
    FOREIGN KEY (maleta_id) REFERENCES maletas(id) ON DELETE CASCADE
  );
`);

// Seed initial data if empty
const sellerCount = db.prepare("SELECT COUNT(*) as count FROM sellers").get() as { count: number };
if (sellerCount.count === 0) {
  db.prepare("INSERT INTO sellers (name, phone, commission_rate) VALUES (?, ?, ?)").run("Maria Silva", "5511999999999", 0.3);
  db.prepare("INSERT INTO sellers (name, phone, commission_rate) VALUES (?, ?, ?)").run("Ana Oliveira", "5511888888888", 0.35);
  db.prepare("INSERT INTO sellers (name, phone, commission_rate) VALUES (?, ?, ?)").run("Juliana Costa", "5511777777777", 0.3);
}

export default db;
