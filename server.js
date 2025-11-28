const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/ams';

let mongoState = { connected: false, error: null };
mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => { mongoState.connected = true; console.log('MongoDB connected'); })
  .catch(err => { mongoState.error = err && err.message ? err.message : String(err); console.error('MongoDB connection failed'); });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database setup
const dbPath = path.join(__dirname, 'ams.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','teacher','student')),
    created_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    teacher_id INTEGER,
    schedule_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(teacher_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_ext_id TEXT UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    class_id INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY(class_id) REFERENCES classes(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    status TEXT NOT NULL CHECK(status IN ('scheduled','open','closed','finalized')),
    created_by INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY(class_id) REFERENCES classes(id),
    FOREIGN KEY(created_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')),
    marked_by INTEGER,
    marked_at TEXT NOT NULL,
    UNIQUE(session_id, student_id),
    FOREIGN KEY(session_id) REFERENCES sessions(id),
    FOREIGN KEY(student_id) REFERENCES students(id),
    FOREIGN KEY(marked_by) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    timestamp TEXT NOT NULL,
    metadata TEXT,
    FOREIGN KEY(actor_user_id) REFERENCES users(id)
  )`);

  // Seed admin if none exists
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) return console.error(err);
    if (row.count === 0) {
      const now = new Date().toISOString();
      const hash = bcrypt.hashSync('admin123', 10);
      db.run(
        'INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)',
        ['Admin', 'admin@example.com', hash, 'admin', now]
      );
      console.log('Seeded default admin: admin@example.com / admin123');
    }
  });
});

// Helpers
function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function logAction(actorUserId, action, entityType, entityId, metadata) {
  const ts = new Date().toISOString();
  db.run(
    'INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,timestamp,metadata) VALUES(?,?,?,?,?,?)',
    [actorUserId || null, action, entityType, entityId || null, ts, metadata ? JSON.stringify(metadata) : null]
  );
}

// Auth routes
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  const finalRole = role && ['student', 'teacher', 'admin'].includes(role) ? role : 'student';
  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)',
    [name, email, hash, finalRole, now],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email already registered' });
        return res.status(500).json({ error: 'Registration failed' });
      }
      logAction(null, 'register', 'user', this.lastID, { email, role: finalRole });
      res.json({ id: this.lastID, name, email, role: finalRole });
    }
  );
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ error: 'Login failed' });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    const ok = bcrypt.compareSync(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });
    const token = signToken(user);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
});

// Classes CRUD
app.get('/api/classes', auth, (req, res) => {
  db.all('SELECT * FROM classes', (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch classes' });
    res.json(rows);
  });
});

app.post('/api/classes', auth, requireRole('admin', 'teacher'), (req, res) => {
  const { name, code, teacherId, schedule } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO classes(name,code,teacher_id,schedule_json,created_at) VALUES(?,?,?,?,?)',
    [name, code || null, teacherId || null, schedule ? JSON.stringify(schedule) : null, now],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to create class' });
      logAction(req.user.id, 'create', 'class', this.lastID, { name, code, teacherId });
      res.json({ id: this.lastID, name, code, teacherId, schedule });
    }
  );
});

// Students CRUD
app.get('/api/classes/:id/students', auth, (req, res) => {
  db.all('SELECT * FROM students WHERE class_id = ?', [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch students' });
    res.json(rows);
  });
});

app.post('/api/classes/:id/students', auth, requireRole('admin', 'teacher'), (req, res) => {
  const { studentId, name, email } = req.body;
  if (!studentId || !name) return res.status(400).json({ error: 'Missing fields' });
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO students(student_ext_id,name,email,class_id,created_at) VALUES(?,?,?,?,?)',
    [studentId, name, email || null, req.params.id, now],
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Student ID exists' });
        return res.status(500).json({ error: 'Failed to add student' });
      }
      logAction(req.user.id, 'create', 'student', this.lastID, { classId: req.params.id });
      res.json({ id: this.lastID, studentId, name, email, classId: Number(req.params.id) });
    }
  );
});

app.delete('/api/students/:id', auth, requireRole('admin', 'teacher'), (req, res) => {
  db.run('DELETE FROM students WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to remove student' });
    logAction(req.user.id, 'delete', 'student', req.params.id);
    res.json({ deleted: this.changes > 0 });
  });
});

// Sessions & Attendance with constraints
function isWithinWindow(date, startTime, endTime, cutoffMinutes = 30) {
  if (!startTime || !endTime) return true; // If times not set, allow
  const now = new Date();
  const sessionStart = new Date(`${date}T${startTime}:00`);
  const sessionEnd = new Date(`${date}T${endTime}:00`);
  const cutoff = new Date(sessionEnd.getTime() + cutoffMinutes * 60 * 1000);
  return now >= sessionStart && now <= cutoff;
}

app.post('/api/sessions', auth, requireRole('admin', 'teacher'), (req, res) => {
  const { classId, date, startTime, endTime } = req.body;
  if (!classId || !date) return res.status(400).json({ error: 'Missing fields' });
  const now = new Date().toISOString();
  db.run(
    'INSERT INTO sessions(class_id,date,start_time,end_time,status,created_by,created_at) VALUES(?,?,?,?,?,?,?)',
    [classId, date, startTime || null, endTime || null, 'open', req.user.id, now],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to create session' });
      logAction(req.user.id, 'create', 'session', this.lastID, { classId, date });
      res.json({ id: this.lastID, classId, date, startTime, endTime, status: 'open' });
    }
  );
});

app.get('/api/sessions', auth, (req, res) => {
  const { classId, date } = req.query;
  const params = [];
  let sql = 'SELECT * FROM sessions WHERE 1=1';
  if (classId) { sql += ' AND class_id = ?'; params.push(classId); }
  if (date) { sql += ' AND date = ?'; params.push(date); }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch sessions' });
    res.json(rows);
  });
});

app.post('/api/attendance/mark', auth, requireRole('admin', 'teacher'), (req, res) => {
  const { sessionId, studentId, status } = req.body;
  if (!sessionId || !studentId || !status) return res.status(400).json({ error: 'Missing fields' });
  if (!['present','absent','late','excused'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  db.get('SELECT * FROM sessions WHERE id = ?', [sessionId], (err, session) => {
    if (err || !session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'finalized') return res.status(409).json({ error: 'Session finalized' });
    const allowed = isWithinWindow(session.date, session.start_time, session.end_time);
    if (!allowed) return res.status(403).json({ error: 'Outside allowed marking window' });
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO attendance(session_id,student_id,status,marked_by,marked_at) VALUES(?,?,?,?,?) ON CONFLICT(session_id,student_id) DO UPDATE SET status=excluded.status, marked_by=excluded.marked_by, marked_at=excluded.marked_at',
      [sessionId, studentId, status, req.user.id, now],
      function (err2) {
        if (err2) return res.status(500).json({ error: 'Failed to mark attendance' });
        logAction(req.user.id, 'mark', 'attendance', null, { sessionId, studentId, status });
        res.json({ ok: true });
      }
    );
  });
});

app.post('/api/sessions/:id/finalize', auth, requireRole('admin', 'teacher'), (req, res) => {
  const sessionId = req.params.id;
  db.run('UPDATE sessions SET status = ? WHERE id = ?', ['finalized', sessionId], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to finalize session' });
    logAction(req.user.id, 'finalize', 'session', sessionId);
    res.json({ finalized: this.changes > 0 });
  });
});

// Reports
app.get('/api/reports/summary', auth, (req, res) => {
  const sql = `
    SELECT c.id as classId, c.name as className,
           COUNT(DISTINCT s.id) as studentCount,
           COUNT(DISTINCT sess.id) as sessionCount,
           SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as presents,
           SUM(CASE WHEN a.status IN ('absent','late','excused') THEN 1 ELSE 0 END) as others
    FROM classes c
    LEFT JOIN students s ON s.class_id = c.id
    LEFT JOIN sessions sess ON sess.class_id = c.id
    LEFT JOIN attendance a ON a.session_id = sess.id
    GROUP BY c.id
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to generate summary' });
    const formatted = rows.map(r => {
      const totalMarks = (r.presents || 0) + (r.others || 0);
      const avg = totalMarks > 0 ? ((r.presents || 0) / totalMarks) * 100 : 0;
      return { classId: r.classId, className: r.className, studentCount: r.studentCount, sessionCount: r.sessionCount, averageAttendance: Number(avg.toFixed(1)) };
    });
    res.json(formatted);
  });
});

app.get('/api/reports/student/:id', auth, (req, res) => {
  const sql = `
    SELECT st.id as studentId, st.name as studentName, st.student_ext_id as extId, st.email, c.name as className,
           sess.date, a.status
    FROM students st
    LEFT JOIN classes c ON c.id = st.class_id
    LEFT JOIN attendance a ON a.student_id = st.id
    LEFT JOIN sessions sess ON sess.id = a.session_id
    WHERE st.id = ?
    ORDER BY sess.date DESC
  `;
  db.all(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch report' });
    res.json(rows);
  });
});

app.get('/api/reports/class/:id', auth, (req, res) => {
  const sql = `
    SELECT st.id as studentId, st.name as studentName, st.student_ext_id as extId,
           SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as presents,
           COUNT(a.id) as totalMarks
    FROM students st
    LEFT JOIN attendance a ON a.student_id = st.id
    WHERE st.class_id = ?
    GROUP BY st.id
  `;
  db.all(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch class report' });
    const formatted = rows.map(r => ({
      studentId: r.studentId,
      name: r.studentName,
      extId: r.extId,
      attendancePercent: r.totalMarks > 0 ? Number(((r.presents || 0) / r.totalMarks * 100).toFixed(1)) : 0
    }));
    res.json(formatted);
  });
});

app.get('/api/health', (req, res) => {
  db.get('SELECT 1', [], (err) => {
    const sqliteConnected = !err;
    res.json({ sqliteConnected, mongoConnected: mongoState.connected, mongoError: mongoState.error || null });
  });
});

// Serve static frontend
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`AMS server running at http://localhost:${PORT}/`);
});
