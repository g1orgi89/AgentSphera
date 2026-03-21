const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: [true, 'Укажите имя клиента'],
      trim: true,
      minlength: [2, 'Имя минимум 2 символа'],
      maxlength: [200, 'Имя не должно превышать 200 символов']
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    birthday: {
      type: Date,
      default: null
    },
    preferredContact: {
      type: String,
      enum: ['Телефон', 'Email', 'Telegram', 'WhatsApp', 'СМС', 'Звонок', ''],
      default: ''
    },
    status: {
      type: String,
      enum: ['active', 'potential', 'inactive'],
      default: 'active'
    },
    note: {
      type: String,
      trim: true,
      default: ''
    },
    link: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Индексы
clientSchema.index({ userId: 1, name: 1 });
clientSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Client', clientSchema);
