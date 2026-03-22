const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth');
const Act = require('../models/Act');
const {
  extractTextFromFile,
  parseWithClaude,
  reconcileItems,
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
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
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

// --- POST /acts — создать акт (ручной ввод или сохранение после предпросмотра) ---

router.post('/', async (req, res) => {
  try {
    const { company, period, source, originalFileName, items } = req.body;

    if (!company || !company.trim()) {
      return res.status(400).json({ success: false, error: 'Укажите страховую компанию' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Добавьте хотя бы одну строку' });
    }

    // Если source === 'manual' и items ещё не сверены — сверяем
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

// --- POST /acts/upload — умный парсинг файла (предпросмотр, без сохранения) ---

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }

    const { company, period } = req.body;

    if (!company || !company.trim()) {
      return res.status(400).json({ success: false, error: 'Укажите страховую компанию' });
    }

    // 1. Извлечь текст из файла
    const text = await extractTextFromFile(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname
    );

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Не удалось извлечь текст из файла' });
    }

    // 2. Отправить в Claude AI
    const parsedItems = await parseWithClaude(text);

    if (parsedItems.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'В документе не найдены данные о договорах'
      });
    }

    // 3. Сверить с базой
    const reconciledItems = await reconcileItems(parsedItems, req.user._id);

    // 4. Вернуть для предпросмотра (не сохраняя)
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

    // Ошибка multer (размер, формат)
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

// --- DELETE /acts/:id — удалить акт ---

router.delete('/:id', async (req, res) => {
  try {
    const act = await Act.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!act) {
      return res.status(404).json({ success: false, error: 'Акт не найден' });
    }

    res.json({ success: true, data: {} });
  } catch (error) {
    console.error('Delete act error:', error);
    res.status(500).json({ success: false, error: 'Ошибка удаления акта' });
  }
});

module.exports = router;
