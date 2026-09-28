require('dotenv').config();
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { Pool } = require('pg');

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
});
const publisher = new IORedis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

function fill(text, data) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '');
}

const worker = new Worker(
  'inapp',
  async (job) => {
    const { logId, user_id, template, data } = job.data;

    await db.query(
      'UPDATE notification_log SET attempts = attempts + 1 WHERE id = $1',
      [logId]
    );

    const user = (
      await db.query('SELECT name FROM users WHERE id = $1', [user_id])
    ).rows[0];
    const tpl = (
      await db.query('SELECT subject, body FROM templates WHERE name = $1', [template])
    ).rows[0];

    const vars = { name: user.name, ...data };

    const saved = await db.query(
      'INSERT INTO in_app_notifications (user_id, title, body) VALUES ($1, $2, $3) RETURNING *',
      [user_id, fill(tpl.subject, vars), fill(tpl.body, vars)]
    );

    await publisher.publish('inapp-events', JSON.stringify(saved.rows[0]));

    await db.query(
      "UPDATE notification_log SET status = 'sent', error = NULL WHERE id = $1",
      [logId]
    );

    console.log(`In-app notification saved for user ${user_id}`);
  },
  { connection }
);

worker.on('failed', async (job, err) => {
  console.error(`Attempt ${job.attemptsMade} failed for log ${job.data.logId}:`, err.message);
  if (job.attemptsMade >= job.opts.attempts) {
    await db.query(
      "UPDATE notification_log SET status = 'failed', error = $2 WHERE id = $1",
      [job.data.logId, err.message]
    );
  }
});

console.log('In-app worker is running...');