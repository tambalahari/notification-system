require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const db = new Pool({ connectionString: process.env.DATABASE_URL });

app.get('/health', async (req, res) => {
  const result = await db.query('SELECT COUNT(*) FROM users');
  res.json({ status: 'ok', users: result.rows[0].count });
});

app.listen(process.env.PORT, () =>
  console.log(`API running on port ${process.env.PORT}`)
);