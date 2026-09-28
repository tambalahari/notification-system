const express = require('express');
const db = require('../db');
const redis = require('../redis');
const queues = require('../queues');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { user_id, template, data = {}, event_id } = req.body;

    if (!user_id || !template || !event_id) {
      return res
        .status(400)
        .json({ error: 'user_id, template and event_id are required' });
    }

    const tpl = await db.query('SELECT * FROM templates WHERE name = $1', [template]);
    if (!tpl.rows.length) {
      return res.status(404).json({ error: 'Template not found' });
    }
    const channel = tpl.rows[0].channel;

    const user = await db.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (!user.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const setting = await db.query(
      'SELECT opt_in FROM notification_settings WHERE user_id = $1 AND channel = $2',
      [user_id, channel]
    );
    if (setting.rows.length && !setting.rows[0].opt_in) {
      return res.status(200).json({ status: 'skipped', reason: 'user opted out' });
    }

    const dedupeKey = `event:${event_id}:${user_id}`;
    const isNew = await redis.set(dedupeKey, '1', 'EX', 86400, 'NX');
    if (!isNew) {
      return res.status(200).json({ status: 'duplicate', reason: 'event already processed' });
    }

    const rateKey = `rate:${user_id}`;
    const count = await redis.incr(rateKey);
    if (count === 1) await redis.expire(rateKey, 3600);
    if (count > 10) {
      await redis.del(dedupeKey);
      return res.status(429).json({ error: 'Rate limit exceeded for this user' });
    }

    const log = await db.query(
      'INSERT INTO notification_log (user_id, channel) VALUES ($1, $2) RETURNING id',
      [user_id, channel]
    );
    const logId = log.rows[0].id;

    await queues[channel].add('send', { logId, user_id, template, data });

    res.status(202).json({ status: 'queued', log_id: logId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;