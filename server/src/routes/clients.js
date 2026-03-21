const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const clientService = require('../services/clientService');

// Все роуты защищены авторизацией
router.use(protect);

// GET /api/v1/clients — список с поиском, фильтрами, сортировкой, пагинацией
router.get('/', async (req, res) => {
  try {
    const { search, status, sort, page, limit } = req.query;
    const result = await clientService.getClients(req.user._id, {
      search,
      status,
      sort,
      page,
      limit
    });

    res.json({
      success: true,
      data: result.clients,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка клиентов'
    });
  }
});

// GET /api/v1/clients/:id — карточка клиента
router.get('/:id', async (req, res) => {
  try {
    const client = await clientService.getClientById(req.user._id, req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден'
      });
    }

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    // Невалидный ObjectId
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении клиента'
    });
  }
});

// GET /api/v1/clients/:id/summary — сводка клиента
router.get('/:id/summary', async (req, res) => {
  try {
    // Проверяем что клиент существует и принадлежит пользователю
    const client = await clientService.getClientById(req.user._id, req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден'
      });
    }

    const summary = await clientService.getClientSummary(req.user._id, req.params.id);

    res.json({
      success: true,
      data: summary
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
      error: 'Ошибка при получении сводки'
    });
  }
});

// POST /api/v1/clients — создать клиента
router.post('/', async (req, res) => {
  try {
    const result = await clientService.createClient(req.user._id, req.body);

    const response = {
      success: true,
      data: result.client
    };

    // Предупреждение о дубликате (не блокировка)
    if (result.warning) {
      response.warning = result.warning;
    }

    res.status(201).json(response);
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
      error: 'Ошибка при создании клиента'
    });
  }
});

// PUT /api/v1/clients/:id — обновить клиента
router.put('/:id', async (req, res) => {
  try {
    const client = await clientService.updateClient(req.user._id, req.params.id, req.body);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден'
      });
    }

    res.json({
      success: true,
      data: client
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
      error: 'Ошибка при обновлении клиента'
    });
  }
});

// DELETE /api/v1/clients/:id — удалить клиента (каскад)
router.delete('/:id', async (req, res) => {
  try {
    const client = await clientService.deleteClient(req.user._id, req.params.id);

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Клиент не найден'
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
        error: 'Клиент не найден'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении клиента'
    });
  }
});

module.exports = router;
