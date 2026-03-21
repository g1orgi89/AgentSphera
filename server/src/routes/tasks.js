const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const taskService = require('../services/taskService');

// Все роуты защищены авторизацией
router.use(protect);

// GET /api/v1/tasks — список с фильтрами, сортировкой, пагинацией
router.get('/', async (req, res) => {
  try {
    const { filter, sort, page, limit } = req.query;
    const result = await taskService.getTasks(req.user._id, {
      filter,
      sort,
      page,
      limit
    });

    res.json({
      success: true,
      data: result.tasks,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка задач'
    });
  }
});

// POST /api/v1/tasks — создать задачу
router.post('/', async (req, res) => {
  try {
    const task = await taskService.createTask(req.user._id, req.body);

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: messages.join(', ')
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании задачи'
    });
  }
});

// PUT /api/v1/tasks/:id — обновить задачу
router.put('/:id', async (req, res) => {
  try {
    const task = await taskService.updateTask(req.user._id, req.params.id, req.body);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Задача не найдена'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
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
        error: 'Задача не найдена'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении задачи'
    });
  }
});

// PATCH /api/v1/tasks/:id/toggle — переключить done
router.patch('/:id/toggle', async (req, res) => {
  try {
    const task = await taskService.toggleTask(req.user._id, req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Задача не найдена'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Задача не найдена'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при переключении задачи'
    });
  }
});

// DELETE /api/v1/tasks/:id — удалить задачу
router.delete('/:id', async (req, res) => {
  try {
    const task = await taskService.deleteTask(req.user._id, req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Задача не найдена'
      });
    }

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Задача не найдена'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении задачи'
    });
  }
});

module.exports = router;
