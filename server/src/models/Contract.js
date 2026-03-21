const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: [0, 'Сумма взноса не может быть отрицательной']
    },
    dueDate: {
      type: Date,
      required: true
    },
    paid: {
      type: Boolean,
      default: false
    },
    paidDate: {
      type: Date,
      default: null
    }
  },
  { _id: true }
);

const contractSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Укажите клиента']
    },
    company: {
      type: String,
      required: [true, 'Укажите страховую компанию'],
      trim: true,
      minlength: [1, 'Название СК не может быть пустым'],
      maxlength: [200, 'Название СК не более 200 символов']
    },
    number: {
      type: String,
      trim: true,
      default: ''
    },
    type: {
      type: String,
      required: [true, 'Укажите тип договора'],
      trim: true,
      minlength: [1, 'Тип не может быть пустым'],
      maxlength: [100, 'Тип не более 100 символов']
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    objectType: {
      type: String,
      enum: ['auto', 'realty', 'life', ''],
      default: ''
    },
    objectData: {
      // auto
      car: { type: String, trim: true, default: '' },
      plate: { type: String, trim: true, default: '' },
      vin: { type: String, trim: true, default: '' },
      // realty
      realtyType: { type: String, trim: true, default: '' },
      address: { type: String, trim: true, default: '' },
      area: { type: Number, default: null },
      // life
      insured: { type: String, trim: true, default: '' },
      age: { type: Number, default: null },
      sumInsured: { type: Number, default: null }
    },
    premium: {
      type: Number,
      required: [true, 'Укажите премию'],
      min: [0, 'Премия не может быть отрицательной']
    },
    commissionType: {
      type: String,
      enum: ['%', 'fix'],
      default: '%'
    },
    commissionValue: {
      type: Number,
      min: [0, 'Комиссия не может быть отрицательной'],
      default: 0
    },
    installments: {
      type: [installmentSchema],
      validate: {
        validator: function (arr) {
          return arr.length <= 4;
        },
        message: 'Максимум 4 взноса'
      },
      default: []
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
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Виртуальное поле: сумма комиссии
contractSchema.virtual('commissionAmount').get(function () {
  if (this.commissionType === '%') {
    return Math.round((this.premium || 0) * (this.commissionValue || 0) / 100);
  }
  return this.commissionValue || 0;
});

// Виртуальное поле: статус договора
contractSchema.virtual('status').get(function () {
  if (!this.endDate) return 'active';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(this.endDate);
  end.setHours(0, 0, 0, 0);
  const diffMs = end - now;
  const daysUntilEnd = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysUntilEnd < 0) return 'expired';
  if (daysUntilEnd <= 7) return 'expiring_7';
  if (daysUntilEnd <= 14) return 'expiring_14';
  if (daysUntilEnd <= 30) return 'expiring_30';
  return 'active';
});

// Валидация: endDate >= startDate
contractSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate) {
    if (new Date(this.endDate) < new Date(this.startDate)) {
      this.invalidate('endDate', 'Дата окончания не может быть раньше даты начала');
    }
  }
  next();
});

// Индексы
contractSchema.index({ userId: 1, clientId: 1 });
contractSchema.index({ userId: 1, endDate: 1 });
contractSchema.index({ userId: 1, company: 1 });

module.exports = mongoose.model('Contract', contractSchema);
