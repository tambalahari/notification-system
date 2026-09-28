require('dotenv').config();
const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const connection = new IORedis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  maxRetriesPerRequest: null,
});

let transporter;
async function getTransporter() {
  if (!transporter) {
    const account = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: account.user, pass: account.pass },
    });
  }
  return transporter;
}

function fill(text, data) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? '');
}

const worker = new Worker(
  'email',
  async (job) => {
    const { logId, user_id, template, data } = job.data;

    await db.query(
      'UPDATE notification_log SET attempts = attempts + 1 WHERE id = $1',
      [logId]
    );

    const user = (
      await db.query('SELECT name, email FROM users WHERE id = $1', [user_id])
    ).rows[0];
    const tpl = (
      await db.query('SELECT subject, body FROM templates WHERE name = $1', [template])
    ).rows[0];

    const vars = { name: user.name, ...data };
    const mailer = await getTransporter();

    const info = await mailer.sendMail({
      from: '"Notification System" <no-reply@example.com>',
      to: user.email,
      subject: fill(tpl.subject, vars),
      text: fill(tpl.body, vars),
    });

    await db.query(
      "UPDATE notification_log SET status = 'sent', error = NULL WHERE id = $1",
      [logId]
    );

    console.log(`Email sent to ${user.email}`);
    console.log('Preview:', nodemailer.getTestMessageUrl(info));
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
    console.error(`Log ${job.data.logId} marked as failed`);
  }
});

console.log('Email worker is running...');