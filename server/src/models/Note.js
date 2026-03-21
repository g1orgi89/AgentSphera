const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
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
    text: {
      type: String,
      required: [true, 'Укажите текст заметки'],
      trim: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Индексы
noteSchema.index({ userId: 1, clientId: 1, date: -1 });

module.exports = mongoose.model('Note', noteSchema);
