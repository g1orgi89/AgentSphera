const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Укажите имя'],
      trim: true,
      maxlength: [200, 'Имя не должно превышать 200 символов']
    },
    email: {
      type: String,
      required: [true, 'Укажите email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Укажите корректный email']
    },
    password: {
      type: String,
      required: [true, 'Укажите пароль'],
      minlength: [6, 'Пароль минимум 6 символов'],
      select: false
    },
    role: {
      type: String,
      enum: ['agent', 'admin'],
      default: 'agent'
    }
  },
  {
    timestamps: true
  }
);

// Pre-save: хеширование пароля
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Сравнение пароля
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Генерация access token (15 мин)
userSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m'
  });
};

// Генерация refresh token (7 дней)
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

module.exports = mongoose.model('User', userSchema);
