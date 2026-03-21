const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const contractService = require('../services/contractService');

// Все роуты защищены авторизацией
router.use(protect);

// GET /api/v1/contracts/totals — итого (до /:id чтобы не конфликтовать)
router.get('/totals', async (req, res) => {
  try {
    const { company, type, objectType, status } = req.query;
    const totals = await contractService.getTotals(req.user._id, {
      company,
      type,
      objectType,
      status
    });

    res.json({
      success: true,
      data: totals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении итогов'
    });
  }
});

// GET /api/v1/contracts — список с поиском, фильтрами, сортировкой, пагинацией
router.get('/', async (req, res) => {
  try {
    const { search, company, type, objectType, status, sort, page, limit } = req.query;
    const result = await contractService.getContracts(req.user._id, {
      search,
      company,
      type,
      objectType,
      status,
      sort,
      page,
      limit
    });

    res.json({
      success: true,
      data: result.contracts,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении списка договоров'
    });
  }
});

// GET /api/v1/contracts/:id — детали договора
router.get('/:id', async (req, res) => {
  try {
    const contract = await contractService.getContractById(req.user._id, req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Договор не найден'
      });
    }

    res.json({
      success: true,
      data: contract
    });
  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(404).json({
        success: false,
        error: 'Договор не найден'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при получении договора'
    });
  }
});

// POST /api/v1/contracts — создать договор
router.post('/', async (req, res) => {
  try {
    const contract = await contractService.createContract(req.user._id, req.body);

    res.status(201).json({
      success: true,
      data: contract
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
      error: 'Ошибка при создании договора'
    });
  }
});

// PUT /api/v1/contracts/:id — обновить договор
router.put('/:id', async (req, res) => {
  try {
    const contract = await contractService.updateContract(req.user._id, req.params.id, req.body);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Договор не найден'
      });
    }

    res.json({
      success: true,
      data: contract
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
        error: 'Договор не найден'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении договора'
    });
  }
});

// DELETE /api/v1/contracts/:id — удалить договор
router.delete('/:id', async (req, res) => {
  try {
    const contract = await contractService.deleteContract(req.user._id, req.params.id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Договор не найден'
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
        error: 'Договор не найден'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении договора'
    });
  }
});

// PATCH /api/v1/contracts/:id/installments/:idx — обновить статус взноса
router.patch('/:id/installments/:idx', async (req, res) => {
  try {
    const contract = await contractService.updateInstallment(
      req.user._id,
      req.params.id,
      req.params.idx,
      req.body
    );

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Договор не найден'
      });
    }

    res.json({
      success: true,
      data: contract
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
        error: 'Договор не найден'
      });
    }
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении взноса'
    });
  }
});

module.exports = router;
