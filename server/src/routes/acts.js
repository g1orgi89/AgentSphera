const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth');
const Act = require('../models/Act');
const Contract = require('../models/Contract');
const Client = require('../models/Client');
const {
  extractTextFromFile,
  parseWithClaude,
  reconcileItems,
  updateAccrualCommissions,
  detectSource
} = require('../services/actService');
const { normalizeName, normalizeNameForCompare } = require('../services/importService');

const router = express.Router();
router.use(protect);

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'application/pdf', 'text/csv', 'application/csv'];
  const ext = (file.originalname || '').toLowerCase().split('.').pop();
  if (allowedMimes.includes(file.mimetype) || ['xlsx', 'xls', 'pdf', 'csv'].includes(ext)) cb(null, true);
  else cb(new Error('Допустимые форматы: Excel (.xlsx, .xls), PDF, CSV'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  try {
    const acts = await Act.find({ userId: req.user._id }).sort({ date: -1 });
    res.json({ success: true, data: acts });
  } catch (error) {
    console.error('Get acts error:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки актов' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { company, period, source, originalFileName, items } = req.body;
    if (!company || !company.trim()) return res.status(400).json({ success: false, error: 'Укажите страховую компанию' });
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, error: 'Добавьте хотя бы одну строку' });

    let finalItems = items;
    if (source === 'manual' || !items[0].status) {
      finalItems = await reconcileItems(items.map(item => ({ contractNumber: item.contractNumber || '', clientName: item.clientName || '', actualAmount: Number(item.actualAmount) || 0 })), req.user._id);
    }

    const act = await Act.create({ userId: req.user._id, company: company.trim(), period: (period || '').trim(), source: source || 'manual', originalFileName: (originalFileName || '').trim(), items: finalItems });
    const updatedCount = await updateAccrualCommissions(finalItems, req.user._id);
    console.log(`Act saved: ${finalItems.length} items, ${updatedCount} contracts updated`);
    res.status(201).json({ success: true, data: act });
  } catch (error) {
    console.error('Create act error:', error);
    if (error.name === 'ValidationError') { const messages = Object.values(error.errors).map(e => e.message); return res.status(400).json({ success: false, error: messages.join(', ') }); }
    res.status(500).json({ success: false, error: 'Ошибка создания акта' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: 'Файл не загружен' });
    const { company, period } = req.body;
    if (!company || !company.trim()) return res.status(400).json({ success: false, error: 'Укажите страховую компанию' });

    const text = await extractTextFromFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (!text || text.trim().length === 0) return res.status(400).json({ success: false, error: 'Не удалось извлечь текст из файла' });

    const parsedItems = await parseWithClaude(text);
    if (parsedItems.length === 0) return res.status(400).json({ success: false, error: 'В документе не найдены данные о договорах' });

    const reconciledItems = await reconcileItems(parsedItems, req.user._id);
    const source = detectSource(req.file.mimetype, req.file.originalname);
    res.json({ success: true, data: { items: reconciledItems, source, originalFileName: req.file.originalname, company: company.trim(), period: (period || '').trim() } });
  } catch (error) {
    console.error('Upload act error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'Файл слишком большой (макс. 5MB)' });
    if (error.message && error.message.includes('Допустимые форматы')) return res.status(400).json({ success: false, error: error.message });
    res.status(500).json({ success: false, error: error.message || 'Ошибка обработки файла' });
  }
});

// --- POST /acts/:id/add-contract --- Добавить договор из акта (для "не найденных") ---

router.post('/:id/add-contract', async (req, res) => {
  try {
    const { itemIndex } = req.body;
    const act = await Act.findOne({ _id: req.params.id, userId: req.user._id });
    if (!act) return res.status(404).json({ success: false, error: 'Акт не найден' });

    const idx = parseInt(itemIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= act.items.length) {
      return res.status(400).json({ success: false, error: 'Неверный индекс строки' });
    }

    const item = act.items[idx];
    const rawName = (item.clientName || '').trim();
    const contractNumber = (item.contractNumber || '').trim();

    if (!rawName && !contractNumber) {
      return res.status(400).json({ success: false, error: 'Нет данных для создания договора' });
    }

    // 1. Найти существующего клиента (та же логика нормализации что при импорте)
    let clientId = null;
    if (rawName) {
      const cleanName = normalizeName(rawName);
      const normalizedSearch = normalizeNameForCompare(rawName);

      // Загружаем всех клиентов и ищем по нормализованному имени
      const allClients = await Client.find({ userId: req.user._id });
      let foundClient = null;

      for (const c of allClients) {
        const cNorm = normalizeNameForCompare(c.name);
        if (cNorm === normalizedSearch) {
          foundClient = c;
          break;
        }
      }

      if (foundClient) {
        clientId = foundClient._id;
      } else {
        // Не нашли — создаём нового клиента с очищенным именем
        const newClient = await Client.create({
          userId: req.user._id,
          name: cleanName,
          phone: '',
          email: '',
          status: 'active'
        });
        clientId = newClient._id;
      }
    }

    if (!clientId) {
      return res.status(400).json({ success: false, error: 'Не удалось определить клиента' });
    }

    // 2. Создать договор
    const contract = await Contract.create({
      userId: req.user._id,
      clientId,
      company: act.company || '',
      number: contractNumber,
      type: 'Не указан',
      premium: 0,
      commissionType: 'fix',
      commissionValue: Math.abs(item.actualAmount) || 0,
      accrualCommission: item.actualAmount || 0,
      note: `Добавлен из акта ${act.company} ${act.period || ''}`.trim()
    });

    // 3. Обновить строку акта
    act.items[idx].status = 'found';
    act.items[idx].confidence = 'exact';
    act.items[idx].contractId = contract._id;
    act.items[idx].expectedAmount = contract.commissionValue;
    await act.save();

    res.json({ success: true, data: act });
  } catch (error) {
    console.error('Add contract from act error:', error);
    res.status(500).json({ success: false, error: error.message || 'Ошибка добавления договора' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const act = await Act.findOne({ _id: req.params.id, userId: req.user._id });
    if (!act) return res.status(404).json({ success: false, error: 'Акт не найден' });

    if (act.items && act.items.length > 0) {
      for (const item of act.items) {
        if (item.contractId && item.status !== 'unknown' && item.actualAmount) {
          try { await Contract.findOneAndUpdate({ _id: item.contractId, userId: req.user._id }, { $inc: { accrualCommission: -(item.actualAmount || 0) } }); } catch (e) {}
        }
      }
    }

    await Act.deleteOne({ _id: act._id });
    res.json({ success: true, data: {} });
  } catch (error) {
    console.error('Delete act error:', error);
    res.status(500).json({ success: false, error: 'Ошибка удаления акта' });
  }
});

module.exports = router;
