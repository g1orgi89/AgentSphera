const mongoose = require('mongoose');

const actItemSchema = new mongoose.Schema(
  {
    contractNumber: {
      type: String,
      trim: true,
      default: ''
    },
    clientName: {
      type: String,
      trim: true,
      default: ''
    },
    expectedAmount: {
      type: Number,
      default: 0
    },
    actualAmount: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['ok', 'diff', 'found', 'unknown'],
      default: 'unknown'
    },
    confidence: {
      type: String,
      enum: ['exact', 'partial', 'name_partial', 'name_only', 'none', ''],
      default: ''
    },
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contract',
      default: null
    }
  },
  { _id: true }
);

const actSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    company: {
      type: String,
      required: [true, 'Укажите страховую компанию'],
      trim: true
    },
    period: {
      type: String,
      trim: true,
      default: ''
    },
    date: {
      type: Date,
      default: Date.now
    },
    source: {
      type: String,
      enum: ['excel', 'pdf', 'csv', 'manual'],
      default: 'manual'
    },
    originalFileName: {
      type: String,
      trim: true,
      default: ''
    },
    items: {
      type: [actItemSchema],
      validate: {
        validator: function (arr) {
          return arr.length >= 1;
        },
        message: 'Акт должен содержать хотя бы одну строку'
      }
    }
  },
  {
    timestamps: true
  }
);

actSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Act', actSchema);
