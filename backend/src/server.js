require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');
const runMigrations = require('./db/migrate');

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve uploaded files (photos from agents, attachments from users)
app.use('/uploads', express.static('/app/uploads'));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/survey-orders', require('./routes/surveyOrders'));
app.use('/api/moving-orders', require('./routes/movingOrders'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reviews',      require('./routes/reviews'));
app.use('/api/complaints',   require('./routes/complaints'));
app.use('/api/me/capabilities', require('./routes/capabilities'));
app.use('/api/wallet',         require('./routes/wallet'));
app.use('/api/payments',       require('./routes/payments'));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
runMigrations()
  .then(() => app.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch(err => { console.error('Migration failed, aborting startup:', err.message); process.exit(1); });
