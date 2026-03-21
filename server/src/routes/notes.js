const express = require('express');
const { protect } = require('../middleware/auth');
const Note = require('../models/Note');
const Client = require('../models/Client');

// Роутер для /clients/:clientId/notes (GET, POST)
const clientNotesRouter = express.Router({ mergeParams: true });
clientNotesRouter.use(protect);

// GET /api/v1/clients/:clientId/notes — заметки клиента (sort: date desc)
clientNotesRouter.get('/', async (req, res) => {
  try {
    const { clientId } = req.params;

    // Проверяем что клиент принадлежит пользователю
    const client = await Client.findOne({ _id: clientId, userId: req.user._id });
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден'
      });
    }

    const notes = await Note.find({
      userId: req.user._id,
      clientId
    }).sort({ date: -1 });

    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении заметок'
    });
  }
});

// POST /api/v1/clients/:clientId/notes — добавить заметку
clientNotesRouter.post('/', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { text } = req.body;

    // Проверяем что клиент принадлежит пользователю
    const client = await Client.findOne({ _id: clientId, userId: req.user._id });
    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден'
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Укажите текст заметки'
      });
    }

    const note = await Note.create({
      userId: req.user._id,
      clientId,
      text: text.trim()
    });

    res.status(201).json({
      success: true,
      data: note
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании заметки'
    });
  }
});

// Роутер для /notes/:id (DELETE)
const notesRouter = express.Router();
notesRouter.use(protect);

// DELETE /api/v1/notes/:id — удалить заметку
notesRouter.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });

    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Заметка не найдена'
      });
    }

    await Note.deleteOne({ _id: req.params.id });

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Заметка не найдена'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении заметки'
    });
  }
});

module.exports = { clientNotesRouter, notesRouter };
