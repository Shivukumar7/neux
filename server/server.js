const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // In prod, use .env

app.use(cors());
app.use(express.json());

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Register Route
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Username already exists' });
        }
        console.error(err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }
    try {
        const [users] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = users[0];
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
            res.json({ token, username: user.username });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get all blogs (Protected, User specific)
// Get global feed (Protected)
app.get('/api/blogs', authenticateToken, async (req, res) => {
    try {
        const { date } = req.query;
        let dateFilter = 'CURDATE()';
        let queryParams = [req.user.id];

        if (date) {
            dateFilter = '?';
            queryParams.push(date);
        }

        const query = `
            SELECT 
                b.*, 
                u.username,
                COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 ELSE 0 END), 0) as score,
                MAX(CASE WHEN v.user_id = ? THEN v.vote_type ELSE NULL END) as user_vote
            FROM blogs b
            JOIN users u ON b.user_id = u.id
            LEFT JOIN votes v ON b.id = v.blog_id
            WHERE DATE(b.created_at) = ${dateFilter}
            GROUP BY b.id
            ORDER BY score DESC, created_at DESC
        `;
        const [rows] = await db.query(query, queryParams);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
});

// Create a new blog (Protected)
app.post('/api/blogs', authenticateToken, async (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }
    try {
        // Rate limiting check: max 2 posts per day per user
        const [countResult] = await db.query(
            'SELECT COUNT(*) as count FROM blogs WHERE user_id = ? AND date(created_at) = CURDATE()',
            [req.user.id]
        );

        if (countResult[0].count >= 2) {
            return res.status(429).json({ error: 'Daily limit reached! You can only post 2 thoughts per day.' });
        }

        const [result] = await db.query('INSERT INTO blogs (user_id, content) VALUES (?, ?)', [req.user.id, content]);
        res.status(201).json({ id: result.insertId, content, created_at: new Date() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create blog' });
    }
});

// Update a blog (Protected)
app.put('/api/blogs/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }
    try {
        const [result] = await db.query('UPDATE blogs SET content = ? WHERE id = ? AND user_id = ?', [content, id, req.user.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Blog not found or unauthorized' });
        }
        res.json({ message: 'Blog updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update blog' });
    }
});

// Vote on a blog (Protected)
app.post('/api/blogs/:id/vote', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { vote_type } = req.body; // 'up', 'down', or 'none'

    if (!['up', 'down', 'none'].includes(vote_type)) {
        return res.status(400).json({ error: 'Invalid vote type' });
    }

    try {
        if (vote_type === 'none') {
            await db.query('DELETE FROM votes WHERE user_id = ? AND blog_id = ?', [req.user.id, id]);
        } else {
            const query = `
                INSERT INTO votes (user_id, blog_id, vote_type) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type)
            `;
            await db.query(query, [req.user.id, id, vote_type]);
        }
        res.json({ message: 'Vote recorded' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to vote' });
    }
});

// Delete a blog (Protected - only own blogs)
app.delete('/api/blogs/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM blogs WHERE id = ? AND user_id = ?', [id, req.user.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Blog not found or unauthorized' });
        }
        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete blog' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
