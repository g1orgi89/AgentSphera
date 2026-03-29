const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const clientService = require('../services/clientService');

// Все роуты защищены авторизацией
router.use(protect);

// GET /api/v1/clients/duplicates — найти дубликаты
router.get('/duplicates', async (req, res) => {
  try {
    const duplicates = await clientService.findDuplicates(req.user._id);
    res.json({ success: true, data: duplicates });
  } catch (error) {
    console.error('Find duplicates error:', error);
    res.status(500).json({ success: false, error: 'Ошибка поиска дубликатов' });
  }
});

// POST /api/v1/clients/merge — объединить двух клиентов
router.post('/merge', async (req, res) => {
  try {
    const { keepId, removeId } = req.body;

    if (!keepId || !removeId) {
      return res.status(400).json({ success: false, error: 'Укажите keepId и removeId' });
    }

    const client = await clientService.mergeClients(req.user._id, keepId, removeId);
    res.json({ success: true, data: client });
  } catch (error) {
    console.error('Merge clients error:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Ошибка объединения клиентов' });
  }
});

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

    if (result.warning) {
      response.warning = result.warning;
    }

    res.status(201).json(response);
  } catch (error) {
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
