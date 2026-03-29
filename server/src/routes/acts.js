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
  else cb(new Error('\u0414\u043e\u043f\u0443\u0441\u0442\u0438\u043c\u044b\u0435 \u0444\u043e\u0440\u043c\u0430\u0442\u044b: Excel (.xlsx, .xls), PDF, CSV'), false);
};
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  try {
    const acts = await Act.find({ userId: req.user._id }).sort({ date: -1 });
    res.json({ success: true, data: acts });
  } catch (error) {
    console.error('Get acts error:', error);
    res.status(500).json({ success: false, error: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0430\u043a\u0442\u043e\u0432' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { company, period, source, originalFileName, items } = req.body;
    if (!company || !company.trim()) return res.status(400).json({ success: false, error: '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u0445\u043e\u0432\u0443\u044e \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044e' });
    if (!items || !Array.isArray(items) || items.length === 0) return res.status(400).json({ success: false, error: '\u0414\u043e\u0431\u0430\u0432\u044c\u0442\u0435 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u043d\u0443 \u0441\u0442\u0440\u043e\u043a\u0443' });
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
    res.status(500).json({ success: false, error: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0441\u043e\u0437\u0434\u0430\u043d\u0438\u044f \u0430\u043a\u0442\u0430' });
  }
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: '\u0424\u0430\u0439\u043b \u043d\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043d' });
    const { company, period } = req.body;
    if (!company || !company.trim()) return res.status(400).json({ success: false, error: '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u0445\u043e\u0432\u0443\u044e \u043a\u043e\u043c\u043f\u0430\u043d\u0438\u044e' });
    const text = await extractTextFromFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    if (!text || text.trim().length === 0) return res.status(400).json({ success: false, error: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0438\u0437\u0432\u043b\u0435\u0447\u044c \u0442\u0435\u043a\u0441\u0442' });
    const parsedItems = await parseWithClaude(text);
    if (parsedItems.length === 0) return res.status(400).json({ success: false, error: '\u041d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u044b \u0434\u0430\u043d\u043d\u044b\u0435' });
    const reconciledItems = await reconcileItems(parsedItems, req.user._id);
    const source = detectSource(req.file.mimetype, req.file.originalname);
    res.json({ success: true, data: { items: reconciledItems, source, originalFileName: req.file.originalname, company: company.trim(), period: (period || '').trim() } });
  } catch (error) {
    console.error('Upload act error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: '\u0424\u0430\u0439\u043b \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0431\u043e\u043b\u044c\u0448\u043e\u0439' });
    res.status(500).json({ success: false, error: error.message || '\u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u0431\u0440\u0430\u0431\u043e\u0442\u043a\u0438' });
  }
});

router.post('/:id/add-contract', async (req, res) => {
  try {
    const { itemIndex } = req.body;
    const act = await Act.findOne({ _id: req.params.id, userId: req.user._id });
    if (!act) return res.status(404).json({ success: false, error: '\u0410\u043a\u0442 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d' });

    const idx = parseInt(itemIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= act.items.length) return res.status(400).json({ success: false, error: '\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u0438\u043d\u0434\u0435\u043a\u0441' });

    const item = act.items[idx];
    const rawName = (item.clientName || '').trim();
    const contractNumber = (item.contractNumber || '').trim();
    if (!rawName && !contractNumber) return res.status(400).json({ success: false, error: '\u041d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445' });

    let clientId = null;
    let isNewClient = false;
    let clientName = '';

    if (rawName) {
      const cleanName = normalizeName(rawName);
      const normalizedSearch = normalizeNameForCompare(rawName);
      const allClients = await Client.find({ userId: req.user._id }).lean();
      let foundClient = null;
      for (const c of allClients) {
        if (normalizeNameForCompare(c.name) === normalizedSearch) { foundClient = c; break; }
      }
      if (foundClient) {
        clientId = foundClient._id;
        clientName = foundClient.name;
        isNewClient = false;
      } else {
        const newClient = await Client.create({ userId: req.user._id, name: cleanName, phone: '', email: '', status: 'active' });
        clientId = newClient._id;
        clientName = cleanName;
        isNewClient = true;
      }
    }

    if (!clientId) return res.status(400).json({ success: false, error: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0440\u0435\u0434\u0435\u043b\u0438\u0442\u044c \u043a\u043b\u0438\u0435\u043d\u0442\u0430' });

    const contract = await Contract.create({
      userId: req.user._id, clientId, company: act.company || '', number: contractNumber,
      type: '\u041d\u0435 \u0443\u043a\u0430\u0437\u0430\u043d', premium: 0, commissionType: 'fix',
      commissionValue: Math.abs(item.actualAmount) || 0, accrualCommission: item.actualAmount || 0,
      note: `\u0414\u043e\u0431\u0430\u0432\u043b\u0435\u043d \u0438\u0437 \u0430\u043a\u0442\u0430 ${act.company} ${act.period || ''}`.trim()
    });

    act.items[idx].status = 'found';
    act.items[idx].confidence = 'exact';
    act.items[idx].contractId = contract._id;
    act.items[idx].expectedAmount = contract.commissionValue;
    await act.save();

    res.json({ success: true, data: act, meta: { newClient: isNewClient, clientName } });
  } catch (error) {
    console.error('Add contract from act error:', error);
    res.status(500).json({ success: false, error: error.message || '\u041e\u0448\u0438\u0431\u043a\u0430' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const act = await Act.findOne({ _id: req.params.id, userId: req.user._id });
    if (!act) return res.status(404).json({ success: false, error: '\u0410\u043a\u0442 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d' });
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
    res.status(500).json({ success: false, error: '\u041e\u0448\u0438\u0431\u043a\u0430 \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u044f' });
  }
});

module.exports = router;
