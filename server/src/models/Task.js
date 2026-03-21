const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null
    },
    title: {
      type: String,
      required: [true, 'Укажите название задачи'],
      trim: true,
      minlength: [2, 'Название минимум 2 символа'],
      maxlength: [500, 'Название не более 500 символов']
    },
    dueDate: {
      type: Date,
      default: null
    },
    priority: {
      type: String,
      enum: ['h', 'm', 'l'],
      default: 'm'
    },
    done: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Индексы
taskSchema.index({ userId: 1, done: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
