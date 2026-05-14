const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
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
        await db.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        if (err.code === '23505') { // unique_violation
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
        const result = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = result.rows[0];
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

// Get global feed or group feed (Protected)
app.get('/api/blogs', authenticateToken, async (req, res) => {
    try {
        const { date, group_id } = req.query;
        let queryParams = [req.user.id];
        let conditions = [];

        if (date) {
            queryParams.push(date);
            conditions.push(`DATE(b.created_at) = $${queryParams.length}`);
        } else {
            conditions.push(`DATE(b.created_at) = CURRENT_DATE`);
        }

        if (group_id) {
            // Verify user is in group
            const groupCheck = await db.query('SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2', [group_id, req.user.id]);
            if (groupCheck.rowCount === 0) return res.status(403).json({ error: 'Not in this group' });

            queryParams.push(group_id);
            conditions.push(`b.group_id = $${queryParams.length}`);
        } else {
            conditions.push(`b.group_id IS NULL`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT 
                b.*, 
                u.username,
                COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 WHEN v.vote_type = 'down' THEN -1 ELSE 0 END), 0)::int as score,
                MAX(CASE WHEN v.user_id = $1 THEN v.vote_type ELSE NULL END) as user_vote
            FROM blogs b
            JOIN users u ON b.user_id = u.id
            LEFT JOIN votes v ON b.id = v.blog_id
            ${whereClause}
            GROUP BY b.id, u.username
            ORDER BY score DESC, created_at DESC
        `;
        const result = await db.query(query, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch blogs' });
    }
});

// Create a new blog (Protected)
app.post('/api/blogs', authenticateToken, async (req, res) => {
    const { content, group_id } = req.body;
    if (!content) {
        return res.status(400).json({ error: 'Content is required' });
    }
    try {
        if (group_id) {
            const groupCheck = await db.query('SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2', [group_id, req.user.id]);
            if (groupCheck.rowCount === 0) return res.status(403).json({ error: 'Not in this group' });
        }

        // Rate limiting check: max 2 posts per day per user (only for global feed)
        if (!group_id) {
            const countResult = await db.query(
                'SELECT COUNT(*) as count FROM blogs WHERE user_id = $1 AND group_id IS NULL AND DATE(created_at) = CURRENT_DATE',
                [req.user.id]
            );

            if (parseInt(countResult.rows[0].count) >= 2) {
                return res.status(429).json({ error: 'Daily limit reached! You can only post 2 thoughts per day.' });
            }
        }

        const result = await db.query('INSERT INTO blogs (user_id, content, group_id) VALUES ($1, $2, $3) RETURNING id, created_at', [req.user.id, content, group_id || null]);
        res.status(201).json({ id: result.rows[0].id, content, created_at: result.rows[0].created_at });
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
        const result = await db.query('UPDATE blogs SET content = $1 WHERE id = $2 AND user_id = $3', [content, id, req.user.id]);
        if (result.rowCount === 0) {
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
            await db.query('DELETE FROM votes WHERE user_id = $1 AND blog_id = $2', [req.user.id, id]);
        } else {
            const query = `
                INSERT INTO votes (user_id, blog_id, vote_type) 
                VALUES ($1, $2, $3) 
                ON CONFLICT (user_id, blog_id) DO UPDATE SET vote_type = EXCLUDED.vote_type
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
        const result = await db.query('DELETE FROM blogs WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Blog not found or unauthorized' });
        }
        res.json({ message: 'Blog deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete blog' });
    }
});

// Create a group
app.post('/api/groups', authenticateToken, async (req, res) => {
    const { name, duration_hours } = req.body;
    if (!name || !duration_hours) return res.status(400).json({ error: 'Name and duration are required' });
    
    const joinCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    
    try {
        let result;
        if (duration_hours === 'permanent') {
            result = await db.query(
                `INSERT INTO groups (name, join_code, created_by, expires_at) 
                 VALUES ($1, $2, $3, NULL) RETURNING *`,
                [name, joinCode, req.user.id]
            );
        } else {
            const hours = parseInt(duration_hours);
            result = await db.query(
                `INSERT INTO groups (name, join_code, created_by, expires_at) 
                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP + interval '${hours} hours') RETURNING *`,
                [name, joinCode, req.user.id]
            );
        }
        const group = result.rows[0];
        
        await db.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [group.id, req.user.id]);
        
        res.status(201).json(group);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create group' });
    }
});

// Join a group
app.post('/api/groups/join', authenticateToken, async (req, res) => {
    const { join_code } = req.body;
    if (!join_code) return res.status(400).json({ error: 'Join code is required' });
    
    try {
        const groupRes = await db.query('SELECT * FROM groups WHERE join_code = $1', [join_code]);
        if (groupRes.rowCount === 0) return res.status(404).json({ error: 'Invalid join code' });
        
        const group = groupRes.rows[0];
        if (group.expires_at && new Date(group.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Group has expired' });
        }

        await db.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [group.id, req.user.id]);
        
        res.json({ message: 'Joined successfully', group });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to join group' });
    }
});

// Get user's groups
app.get('/api/groups', authenticateToken, async (req, res) => {
    try {
        // Also cleanup expired groups on fetch
        await db.query('DELETE FROM groups WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP');

        const query = `
            SELECT g.*, 
            (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count
            FROM groups g
            JOIN group_members gm ON g.id = gm.group_id
            WHERE gm.user_id = $1
            ORDER BY g.created_at DESC
        `;
        const result = await db.query(query, [req.user.id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../client/dist')));

app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
