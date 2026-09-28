const { Queue } = require('bullmq');
const redis = require('./redis');

const jobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
  removeOnFail: false,
};

const queues = {
  email: new Queue('email', { connection: redis, defaultJobOptions: jobOptions }),
  push: new Queue('push', { connection: redis, defaultJobOptions: jobOptions }),
  sms: new Queue('sms', { connection: redis, defaultJobOptions: jobOptions }),
};

module.exports = queues;