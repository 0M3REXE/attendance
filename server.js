const express = require('express');
const session = require('express-session');
const path = require('path');
const { db, hash } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'attendance-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000*60*60*2 }
}));

function requireAuth(req, res, next) {
  if (!req.session.faculty) return res.redirect('/login');
  next();
}

// ---------- Auth ----------
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const f = db.prepare('SELECT * FROM faculty WHERE username=?').get(username);
  if (!f || f.password !== hash(password)) {
    return res.render('login', { error: 'Invalid credentials' });
  }
  req.session.faculty = { id: f.id, username: f.username, name: f.name };
  res.redirect('/dashboard');
});
app.get('/logout', (req, res) => { req.session.destroy(()=>{}); res.redirect('/login'); });

// ---------- Dashboard ----------
app.get('/', (req, res) => res.redirect(req.session.faculty ? '/dashboard' : '/login'));
app.get('/dashboard', requireAuth, (req, res) => {
  const students = db.prepare('SELECT * FROM students ORDER BY roll_no').all();
  res.render('dashboard', { faculty: req.session.faculty, students });
});
app.get('/health', (req, res) => res.status(200).send('OK'));

// ---------- Students ----------
app.get('/students/new', requireAuth, (req, res) => res.render('student_new', { faculty: req.session.faculty, error: null }));
app.post('/students', requireAuth, (req, res) => {
  const { roll_no, name, department, semester, email, phone } = req.body;
  try {
    db.prepare('INSERT INTO students (roll_no,name,department,semester,email,phone) VALUES (?,?,?,?,?,?)')
      .run(roll_no, name, department, parseInt(semester), email, phone);
    res.redirect('/dashboard');
  } catch (e) {
    res.render('student_new', { faculty: req.session.faculty, error: 'Roll number already exists' });
  }
});
app.get('/students/:id', requireAuth, (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id=?').get(req.params.id);
  if (!student) return res.redirect('/dashboard');
  const attendance = db.prepare('SELECT * FROM attendance WHERE student_id=? ORDER BY date DESC').all(student.id);
  const present = attendance.filter(a=>a.status==='present').length;
  const pct = attendance.length ? Math.round((present/attendance.length)*100) : 0;
  const marks = db.prepare('SELECT * FROM marks WHERE student_id=? ORDER BY semester,subject').all(student.id);
  const avg = marks.length ? Math.round(marks.reduce((s,m)=>s+m.marks,0)/marks.length) : 0;
  res.render('student_detail', { faculty: req.session.faculty, student, attendance, pct, marks, avg });
});

// ---------- Attendance ----------
app.get('/attendance', requireAuth, (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0,10);
  const students = db.prepare('SELECT * FROM students ORDER BY roll_no').all();
  const existing = db.prepare('SELECT student_id,status FROM attendance WHERE date=?').all(date);
  const map = {}; existing.forEach(e=>map[e.student_id]=e.status);
  res.render('attendance', { faculty: req.session.faculty, students, date, map });
});
app.post('/attendance', requireAuth, (req, res) => {
  const { date } = req.body;
  const students = db.prepare('SELECT id FROM students').all();
  const upsert = db.prepare('INSERT INTO attendance (student_id,date,status) VALUES (?,?,?) ON CONFLICT(student_id,date) DO UPDATE SET status=excluded.status');
  const tx = db.transaction(() => {
    for (const s of students) {
      const status = req.body['status_'+s.id] || 'absent';
      upsert.run(s.id, date, status);
    }
  });
  tx();
  res.redirect('/attendance?date='+date);
});

app.get('/attendance/percentage', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.roll_no, s.name, s.department,
      COUNT(a.id) AS total,
      SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) AS present
    FROM students s LEFT JOIN attendance a ON a.student_id=s.id
    GROUP BY s.id ORDER BY s.roll_no
  `).all();
  const data = rows.map(r => ({
    ...r,
    percentage: r.total ? Math.round((r.present/r.total)*100) : 0
  }));
  res.render('attendance_pct', { faculty: req.session.faculty, data });
});

// ---------- Marks ----------
app.get('/marks/new', requireAuth, (req, res) => {
  const students = db.prepare('SELECT * FROM students ORDER BY roll_no').all();
  res.render('marks_new', { faculty: req.session.faculty, students, error: null });
});
app.post('/marks', requireAuth, (req, res) => {
  const { student_id, subject, marks, max_marks, semester } = req.body;
  db.prepare('INSERT INTO marks (student_id,subject,marks,max_marks,semester) VALUES (?,?,?,?,?)')
    .run(student_id, subject, parseInt(marks), parseInt(max_marks||100), parseInt(semester));
  res.redirect('/students/'+student_id);
});

// ---------- Reports ----------
app.get('/reports', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT s.id, s.roll_no, s.name, s.department, s.semester,
      (SELECT COUNT(*) FROM attendance a WHERE a.student_id=s.id) AS total_classes,
      (SELECT COUNT(*) FROM attendance a WHERE a.student_id=s.id AND a.status='present') AS present_classes,
      (SELECT COALESCE(AVG(marks),0) FROM marks m WHERE m.student_id=s.id) AS avg_marks
    FROM students s ORDER BY s.roll_no
  `).all();
  const data = rows.map(r => ({
    ...r,
    attendance_pct: r.total_classes ? Math.round((r.present_classes/r.total_classes)*100) : 0,
    avg_marks: Math.round(r.avg_marks)
  }));
  res.render('reports', { faculty: req.session.faculty, data });
});

app.listen(PORT, () => console.log(`Attendance app running on http://localhost:${PORT}`));
