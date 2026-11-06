const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'app.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS faculty (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roll_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  semester INTEGER NOT NULL,
  email TEXT,
  phone TEXT
);
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('present','absent')),
  UNIQUE(student_id, date),
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS marks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  marks INTEGER NOT NULL,
  max_marks INTEGER NOT NULL DEFAULT 100,
  semester INTEGER NOT NULL,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
);
`);

function hash(p){ return crypto.scryptSync(p,'salt',32).toString('hex'); }

const existing = db.prepare('SELECT id FROM faculty WHERE username=?').get('admin');
if (!existing) {
  db.prepare('INSERT INTO faculty (username,password,name) VALUES (?,?,?)').run('admin', hash('admin123'), 'Administrator');
}

// Seed sample students
const seedStudents = [
  ['S001','Alice Johnson','CSE',3,'alice@example.com','9000000001'],
  ['S002','Bob Smith','ECE',2,'bob@example.com','9000000002'],
  ['S003','Charlie Brown','ME',4,'charlie@example.com','9000000003'],
  ['S004','Diana Prince','CSE',3,'diana@example.com','9000000004'],
  ['S005','Ethan Hunt','IT',1,'ethan@example.com','9000000005'],
];
const insStu = db.prepare('INSERT OR IGNORE INTO students (roll_no,name,department,semester,email,phone) VALUES (?,?,?,?,?,?)');
for (const s of seedStudents) insStu.run(...s);

// Seed attendance for last 5 days
const attCount = db.prepare('SELECT COUNT(*) AS c FROM attendance').get().c;
if (attCount === 0) {
const students = db.prepare('SELECT id FROM students').all();
const today = new Date();
const statuses = ['present','present','absent','present','present'];
const insAtt = db.prepare('INSERT OR IGNORE INTO attendance (student_id,date,status) VALUES (?,?,?)');
for (let i = 0; i < 5; i++) {
  const d = new Date(today); d.setDate(today.getDate() - i);
  const dateStr = d.toISOString().slice(0,10);
  for (const s of students) {
    insAtt.run(s.id, dateStr, statuses[(s.id + i) % statuses.length]);
  }
}

// Seed marks
const markCount = db.prepare('SELECT COUNT(*) AS c FROM marks').get().c;
if (markCount === 0) {
const subjects = ['Maths','Physics','Programming','DBMS'];
const insMark = db.prepare('INSERT INTO marks (student_id,subject,marks,max_marks,semester) VALUES (?,?,?,?,?)');
for (const s of students) {
  for (const sub of subjects) {
    const m = 60 + Math.floor(Math.random()*35);
    insMark.run(s.id, sub, m, 100, 3);
  }
}
}
}

module.exports = { db, hash };
