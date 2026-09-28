CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20)
);

CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  token TEXT NOT NULL,
  platform VARCHAR(20)
);

CREATE TABLE notification_settings (
  user_id INT REFERENCES users(id),
  channel VARCHAR(20) NOT NULL,
  opt_in BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (user_id, channel)
);

CREATE TABLE templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  channel VARCHAR(20) NOT NULL,
  subject VARCHAR(200),
  body TEXT NOT NULL
);

CREATE TABLE notification_log (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  channel VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'queued',
  attempts INT DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO users (name, email) VALUES
  ('Asha', 'asha@example.com'),
  ('Ravi', 'ravi@example.com'),
  ('Meera', 'meera@example.com');

INSERT INTO notification_settings (user_id, channel, opt_in) VALUES
  (1, 'email', true), (1, 'push', true), (1, 'sms', false),
  (2, 'email', true), (2, 'push', false), (2, 'sms', false),
  (3, 'email', true), (3, 'push', true), (3, 'sms', true);

INSERT INTO templates (name, channel, subject, body) VALUES
  ('welcome', 'email', 'Welcome, {{name}}!', 'Hi {{name}}, thanks for joining us.'),
  ('order_shipped', 'email', 'Your order is on the way', 'Hi {{name}}, order {{orderId}} has shipped.');