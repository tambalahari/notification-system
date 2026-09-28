require('dotenv').config();
const express = require('express');
const db = require('./db');
const notificationRoutes = require('./routes/notifications');

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  const result = await db.query('SELECT COUNT(*) FROM users');
  res.json({ status: 'ok', users: result.rows[0].count });
});

app.use('/api/notifications', notificationRoutes);

app.listen(process.env.PORT, () =>
  console.log(`API running on port ${process.env.PORT}`)
);