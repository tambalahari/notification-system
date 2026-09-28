function auth(req, res, next) {
  const key = req.headers['x-app-key'];
  const secret = req.headers['x-app-secret'];

  if (key !== process.env.APP_KEY || secret !== process.env.APP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = auth;