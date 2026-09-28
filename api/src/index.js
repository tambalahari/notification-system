require('dotenv').config();
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const IORedis = require('ioredis');
const db = require('./db');
const notificationRoutes = require('./routes/notifications');

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  const result = await db.query('SELECT COUNT(*) FROM users');
  res.json({ status: 'ok', users: result.rows[0].count });
});

app.use('/api/notifications', notificationRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} connected`);
  }
});

const subscriber = new IORedis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

subscriber.subscribe('inapp-events');
subscriber.on('message', (channel, message) => {
  const notification = JSON.parse(message);
  io.to(`user:${notification.user_id}`).emit('notification', notification);
});

server.listen(process.env.PORT, () =>
  console.log(`API running on port ${process.env.PORT}`)
);