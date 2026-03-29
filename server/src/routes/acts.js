const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth');
const Act = require('../models/Act');
const Contract = require('../models/Contract');
const {
  extractTextFromFile,
  parseWithClaude,
  reconcileItems,
  updateAccrualCommissions,
  detectSource
} = require('../services/actService');

const router = express.Router();

router.use(protect);

// --- Multer: загрузка файлов в память ---

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/pdf',
    'text/csv',
    'application/csv'
  ];

  const ext = (file.originalname || '').toLowerCase().split('.').pop();
  const allowedExts = ['xlsx', 'xls', 'pdf', 'csv'];

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Допустимые форматы: Excel (.xlsx, .xls), PDF, CSV'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// --- GET /acts — список актов ---

router.get('/', async (req, res) => {
  try {
    const acts = await Act.find({ userId: req.user._id })
      .sort({ date: -1 });
    res.json({ success: true, data: acts });
  } catch (error) {
    console.error('Get acts error:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки актов' });
  }
});

// --- POST /acts — создать акт ---

router.post('/', async (req, res) => {
  try {
    const { company, period, source, originalFileName, items } = req.body;

    if (!company || !company.trim()) {
      return res.status(400).json({ success: false, error: 'Укажите страховую компанию' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Добавьте хотя бы одну строку' });
    }

    let finalItems = items;
    if (source === 'manual' || !items[0].status) {
      finalItems = await reconcileItems(
        items.map(item => ({
          contractNumber: item.contractNumber || '',
          clientName: item.clientName || '',
          actualAmount: Number(item.actualAmount) || 0
        })),
        req.user._id
      );
    }

    const act = await Act.create({
      userId: req.user._id,
      company: company.trim(),
      period: (period || '').trim(),
      source: source || 'manual',
      originalFileName: (originalFileName || '').trim(),
      items: finalItems
    });

    const updatedCount = await updateAccrualCommissions(finalItems, req.user._id);
    console.log(`Act saved: ${finalItems.length} items, ${updatedCount} contracts updated`);

    res.status(201).json({ success: true, data: act });
  } catch (error) {
    console.error('Create act error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, error: messages.join(', ') });
    }
    res.status(500).json({ success: false, error: 'Ошибка создания акта' });
  }
});

// --- POST /acts/upload — умный парсинг файла ---

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }

    const { company, period } = req.body;

    if (!company || !company.trim()) {
      return res.status(400).json({ success: false, error: 'Укажите страховую компанию' });
    }

    const text = await extractTextFromFile(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Не удалось извлечь текст из файла' });
    }

    const parsedItems = await parseWithClaude(text);

    if (parsedItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'В документе не найдены данные о договорах'
      });
    }

    const reconciledItems = await reconcileItems(parsedItems, req.user._id);
    const source = detectSource(req.file.mimetype, req.file.originalname);

    res.json({
      success: true,
      data: {
        items: reconciledItems,
        source,
        originalFileName: req.file.originalname,
        company: company.trim(),
        period: (period || '').trim()
      }
    });
  } catch (error) {
    console.error('Upload act error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Файл слишком большой (макс. 5MB)' });
    }

    if (error.message && error.message.includes('Допустимые форматы')) {
      return res.status(400).json({ success: false, error: error.message });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка обработки файла'
    });
  }
});

// --- DELETE /acts/:id — удалить акт (с откатом accrualCommission) ---

router.delete('/:id', async (req, res) => {
  try {
    // Сначала находим акт (не удаляя)
    const act = await Act.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!act) {
      return res.status(404).json({ success: false, error: 'Акт не найден' });
    }

    // Откатить accrualCommission: вычесть суммы обратно
    if (act.items && act.items.length > 0) {
      for (const item of act.items) {
        if (item.contractId && item.status !== 'unknown' && item.actualAmount) {
          try {
            await Contract.findOneAndUpdate(
              { _id: item.contractId, userId: req.user._id },
              { $inc: { accrualCommission: -(item.actualAmount || 0) } }
            );
          } catch (e) {
            console.error('Error rolling back accrualCommission:', e.message);
          }
        }
      }
    }

    // Теперь удаляем акт
    await Act.deleteOne({ _id: act._id });

    res.json({ success: true, data: {} });
  } catch (error) {
    console.error('Delete act error:', error);
    res.status(500).json({ success: false, error: 'Ошибка удаления акта' });
  }
});

module.exports = router;
