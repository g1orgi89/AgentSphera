const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// POST /api/v1/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Валидация
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Заполните все поля: имя, email, пароль'
      });
    }

    // Проверка существующего пользователя
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Пользователь с таким email уже существует'
      });
    }

    // Создание
    const user = await User.create({ name, email, password });

    // Генерация токенов
    const accessToken = user.generateToken();
    const refreshToken = user.generateRefreshToken();

    // Refresh token в httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token: accessToken
      }
    });
  } catch (error) {
    // Mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера'
    });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Валидация
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Укажите email и пароль'
      });
    }

    // Находим пользователя с паролем
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль'
      });
    }

    // Проверяем пароль
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Неверный email или пароль'
      });
    }

    // Генерация токенов
    const accessToken = user.generateToken();
    const refreshToken = user.generateRefreshToken();

    // Refresh token в httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 дней
    });

    res.json({
      success: true,
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token: accessToken
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка сервера'
    });
  }
});

// GET /api/v1/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    data: {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }
  });
});

module.exports = router;
