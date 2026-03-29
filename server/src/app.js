const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const connectDB = require('./config/db');

const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const { clientNotesRouter, notesRouter } = require('./routes/notes');
const contractRoutes = require('./routes/contracts');
const taskRoutes = require('./routes/tasks');
const exportRoutes = require('./routes/export');
const actRoutes = require('./routes/acts');
const dashboardRoutes = require('./routes/dashboard');
const importRoutes = require('./routes/import');

const app = express();

// Доверять прокси (nginx)
app.set('trust proxy', 1);

app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(morgan('dev'));

const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Слишком много запросов, попробуйте позже' }
});
app.use('/api/', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: 'Слишком много попыток, попробуйте позже' }
});

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/clients/:clientId/notes', clientNotesRouter);
app.use('/api/v1/notes', notesRouter);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/acts', actRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/import', importRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: 'OK' });
});

app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: `Маршрут ${req.method} ${req.originalUrl} не найден` });
});

app.use((err, req, res, next) => {
  console.error('[Ошибка]', err.name, err.message);
  if (process.env.NODE_ENV !== 'production') console.error(err.stack);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Внутренняя ошибка сервера';

  if (err.name === 'ValidationError') { statusCode = 400; const messages = Object.values(err.errors).map(e => e.message); message = messages.join('. '); }
  if (err.name === 'CastError' && err.kind === 'ObjectId') { statusCode = 400; message = 'Неверный формат ID'; }
  if (err.code === 11000) { statusCode = 400; const field = Object.keys(err.keyValue || {}).join(', '); message = `Значение поля ${field} уже существует`; }
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Неверный токен'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Токен истёк'; }
  if (err.code === 'LIMIT_FILE_SIZE') { statusCode = 400; message = 'Файл слишком большой'; }
  if (statusCode === 500 && process.env.NODE_ENV === 'production') message = 'Внутренняя ошибка сервера';

  res.status(statusCode).json({ success: false, error: message });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => { console.log(`Сервер запущен на порту ${PORT}`); });
};

start();
