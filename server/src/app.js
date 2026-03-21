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

// --- Заглушки (будут заменены) ---

app.use('/api/v1/clients', (req, res) => {
  res.json({ success: true, data: 'clients route — заглушка' });
});

app.use('/api/v1/contracts', (req, res) => {
  res.json({ success: true, data: 'contracts route — заглушка' });
});

app.use('/api/v1/tasks', (req, res) => {
  res.json({ success: true, data: 'tasks route — заглушка' });
});

app.use('/api/v1/notes', (req, res) => {
  res.json({ success: true, data: 'notes route — заглушка' });
});

app.use('/api/v1/acts', (req, res) => {
  res.json({ success: true, data: 'acts route — заглушка' });
});

app.use('/api/v1/dashboard', (req, res) => {
  res.json({ success: true, data: 'dashboard route — заглушка' });
});

app.use('/api/v1/export', (req, res) => {
  res.json({ success: true, data: 'export route — заглушка' });
});

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
