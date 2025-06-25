import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
    }
});

const upload = multer({ storage });

// Database setup
const db = new sqlite3.Database(join(__dirname, 'civic_reports.db'));

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'authority')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

    // Reports table
    db.run(`CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('garbage', 'drainage', 'stagnant_water', 'other')),
    severity TEXT NOT NULL CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    location TEXT NOT NULL,
    image_path TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK(status IN ('submitted', 'in_progress', 'resolved')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    reporter_id INTEGER,
    FOREIGN KEY (reporter_id) REFERENCES users (id)
  )`);

    // Authorities table
    db.run(`CREATE TABLE IF NOT EXISTS authorities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    // Insert default users if they don't exist
    const defaultUsers = [
        { username: 'user', password: 'user123', role: 'user' },
        { username: 'authority', password: 'auth123', role: 'authority' }
    ];

    defaultUsers.forEach(user => {
        bcrypt.hash(user.password, 10, (err, hash) => {
            if (err) {
                console.error('Error hashing password:', err);
                return;
            }

            db.run(
                'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
                [user.username, hash, user.role],
                (err) => {
                    if (err) {
                        console.error('Error inserting default user:', err);
                    }
                }
            );
        });
    });

    // Insert sample reports if table is empty
    db.get('SELECT COUNT(*) as count FROM reports', (err, row) => {
        if (err) {
            console.error('Error checking reports count:', err);
            return;
        }

        if (row.count === 0) {
            const sampleReports = [
                {
                    type: 'garbage',
                    severity: 'high',
                    description: 'Large garbage pile near market street',
                    location: 'Market Road, Pendurthi',
                    status: 'resolved',
                    reporter_id: 1
                },
                {
                    type: 'drainage',
                    severity: 'critical',
                    description: 'Clogged drain causing water logging',
                    location: 'Main Street, Pendurthi',
                    status: 'in_progress',
                    reporter_id: 1
                },
                {
                    type: 'stagnant_water',
                    severity: 'medium',
                    description: 'Stagnant water near residential area',
                    location: 'Housing Colony, Pendurthi',
                    status: 'submitted',
                    reporter_id: 1
                }
            ];

            sampleReports.forEach(report => {
                db.run(
                    'INSERT INTO reports (type, severity, description, location, status, reporter_id) VALUES (?, ?, ?, ?, ?, ?)',
                    [report.type, report.severity, report.description, report.location, report.status, report.reporter_id]
                );
            });
        }
    });

    // Update reports table to add lat/lng if not present
    // (Safe to run on every start)
    db.run(`ALTER TABLE reports ADD COLUMN lat REAL`, (err) => { });
    db.run(`ALTER TABLE reports ADD COLUMN lng REAL`, (err) => { });
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Routes

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ error: 'Authentication error' });
            }

            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        });
    });
});

// Get all reports
app.get('/api/reports', authenticateToken, (req, res) => {
    const query = `
    SELECT r.*, u.username as reporter_name 
    FROM reports r 
    LEFT JOIN users u ON r.reporter_id = u.id 
    ORDER BY r.timestamp DESC
  `;

    db.all(query, (err, reports) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(reports);
    });
});

// Create new report
app.post('/api/reports', authenticateToken, upload.single('image'), (req, res) => {
    const { type, description, location, severity = 'medium', lat, lng } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const query = `
    INSERT INTO reports (type, severity, description, location, image_path, reporter_id, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

    db.run(query, [type, severity, description, location, imagePath, req.user.id, lat || null, lng || null], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        // Get the created report
        db.get(
            'SELECT r.*, u.username as reporter_name FROM reports r LEFT JOIN users u ON r.reporter_id = u.id WHERE r.id = ?',
            [this.lastID],
            (err, report) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json(report);
            }
        );
    });
});

// Update report status (authority only)
app.patch('/api/reports/:id/status', authenticateToken, (req, res) => {
    if (req.user.role !== 'authority') {
        return res.status(403).json({ error: 'Only authorities can update report status' });
    }

    const { status } = req.body;
    const { id } = req.params;

    db.run('UPDATE reports SET status = ? WHERE id = ?', [status, id], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.json({ message: 'Status updated successfully' });
    });
});

// Get statistics
app.get('/api/stats', authenticateToken, (req, res) => {
    const queries = {
        totalReports: 'SELECT COUNT(*) as count FROM reports',
        resolvedReports: 'SELECT COUNT(*) as count FROM reports WHERE status = "resolved"',
        inProgress: 'SELECT COUNT(*) as count FROM reports WHERE status = "in_progress"',
        uniqueCitizens: 'SELECT COUNT(DISTINCT reporter_id) as count FROM reports'
    };

    const stats = {};
    let completedQueries = 0;
    const totalQueries = Object.keys(queries).length;

    Object.entries(queries).forEach(([key, query]) => {
        db.get(query, (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            stats[key] = row.count;
            completedQueries++;

            if (completedQueries === totalQueries) {
                // Calculate response time (average time from submission to resolution)
                db.get(
                    'SELECT AVG((julianday("now") - julianday(timestamp)) * 24) as avg_hours FROM reports WHERE status = "resolved"',
                    (err, row) => {
                        if (err) {
                            return res.status(500).json({ error: 'Database error' });
                        }
                        stats.responseTime = row.avg_hours ? `${row.avg_hours.toFixed(1)} hours` : '0 hours';
                        res.json(stats);
                    }
                );
            }
        });
    });
});

// Get user's reports
app.get('/api/user/reports', authenticateToken, (req, res) => {
    const query = `
    SELECT * FROM reports 
    WHERE reporter_id = ? 
    ORDER BY timestamp DESC
  `;

    db.all(query, [req.user.id], (err, reports) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(reports);
    });
});

// Register (Citizen)
app.post('/api/register', (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    // Check if username already exists
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (user) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        // Hash password and insert
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                return res.status(500).json({ error: 'Error hashing password' });
            }
            // Only allow 'authority' if explicitly set, otherwise default to 'user'
            const safeRole = role === 'authority' ? 'authority' : 'user';
            db.run(
                'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                [username, hash, safeRole],
                function (err) {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    // Return JWT and user info
                    const userObj = {
                        id: this.lastID,
                        username,
                        role: safeRole
                    };
                    const token = jwt.sign(userObj, JWT_SECRET, { expiresIn: '24h' });
                    res.status(201).json({ token, user: userObj });
                }
            );
        });
    });
});

// Update report solved image (authority only)
app.patch('/api/reports/:id/image', authenticateToken, upload.single('image'), (req, res) => {
    if (req.user.role !== 'authority') {
        return res.status(403).json({ error: 'Only authorities can upload solved images' });
    }

    const { id } = req.params;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    if (!imagePath) {
        return res.status(400).json({ error: 'Image file is required' });
    }

    db.run('UPDATE reports SET image_path = ? WHERE id = ?', [imagePath, id], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.json({ message: 'Solved image uploaded successfully', image_path: imagePath });
    });
});

// Register Authority
app.post('/api/register-authority', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    db.get('SELECT * FROM authorities WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (user) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        bcrypt.hash(password, 10, (err, hash) => {
            if (err) {
                return res.status(500).json({ error: 'Error hashing password' });
            }
            db.run(
                'INSERT INTO authorities (username, password) VALUES (?, ?)',
                [username, hash],
                function (err) {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    const authorityObj = {
                        id: this.lastID,
                        username,
                        role: 'authority'
                    };
                    const token = jwt.sign(authorityObj, JWT_SECRET, { expiresIn: '24h' });
                    res.status(201).json({ token, user: authorityObj });
                }
            );
        });
    });
});

// Login Authority
app.post('/api/login-authority', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM authorities WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ error: 'Authentication error' });
            }
            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const authorityObj = {
                id: user.id,
                username: user.username,
                role: 'authority'
            };
            const token = jwt.sign(authorityObj, JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, user: authorityObj });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Database initialized at: ${join(__dirname, 'civic_reports.db')}`);
}); 