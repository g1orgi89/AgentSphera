const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const connectDB = require('./config/db');

// Роуты
const authRoutes = require('./routes/auth');
const clientRoutes = require('./routes/clients');
const { clientNotesRouter, notesRouter } = require('./routes/notes');
const contractRoutes = require('./routes/contracts');
const taskRoutes = require('./routes/tasks');
const exportRoutes = require('./routes/export');
const actRoutes = require('./routes/acts');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// --- Middleware ---

app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(morgan('dev'));

// Rate limiting — общий
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Слишком много запросов, попробуйте позже' }
});
app.use('/api/', generalLimiter);

// Rate limiting — auth
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: 'Слишком много попыток, попробуйте позже' }
});

// --- Роуты ---

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/clients/:clientId/notes', clientNotesRouter);
app.use('/api/v1/notes', notesRouter);
app.use('/api/v1/contracts', contractRoutes);
app.use('/api/v1/tasks', taskRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/acts', actRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// --- Health check ---

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: 'OK' });
});

// --- 404 ---

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Маршрут не найден' });
});

// --- Обработка ошибок ---

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Внутренняя ошибка сервера'
  });
});

// --- Запуск ---

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
  });
};

start();
