const XLSX = require('xlsx');
const Anthropic = require('@anthropic-ai/sdk');
const Contract = require('../models/Contract');
const Client = require('../models/Client');

// --- Нормализация имени для сравнения ---

function normalizeNameForCompare(name) {
  if (!name) return '';
  let n = String(name).trim();
  n = n.replace(/\s*\[[\d\s]*\]\s*$/g, '');
  n = n.replace(/[«»""'']/g, '');
  n = n.replace(/\s+/g, ' ');
  return n.toLowerCase().trim();
}

// --- Извлечение текста из файла ---

async function extractTextFromFile(buffer, mimetype, originalName) {
  const ext = (originalName || '').toLowerCase().split('.').pop();

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimetype === 'application/vnd.ms-excel' ||
    ext === 'xlsx' || ext === 'xls'
  ) {
    return extractFromExcel(buffer);
  }

  if (mimetype === 'application/pdf' || ext === 'pdf') {
    return await extractFromPdf(buffer);
  }

  if (
    mimetype === 'text/csv' ||
    mimetype === 'application/csv' ||
    ext === 'csv'
  ) {
    return buffer.toString('utf-8');
  }

  throw new Error('Неподдерживаемый формат файла');
}

function extractFromExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const lines = [];
  workbook.SheetNames.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false
    });

    data.forEach(row => {
      const cells = row.map(cell => {
        if (cell === null || cell === undefined) return '';
        return String(cell).trim();
      }).filter(c => c !== '');

      if (cells.length > 0) {
        lines.push(cells.join(' | '));
      }
    });
  });

  return lines.join('\n');
}

async function extractFromPdf(buffer) {
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text;
}

// --- Парсинг через Claude AI ---

async function parseWithClaude(text) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY не настроен в .env');
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `Ты парсер актов сверки от страховых компаний. Из документа извлеки строки с данными о договорах.

Для каждой строки найди:
- contractNumber — номер договора/полиса
- clientName — имя клиента/страхователя
- amount — сумма комиссии (агентское вознаграждение / КВ). Если нет явной комиссии, используй итоговую сумму. Может быть отрицательной (возврат/сторно).

Верни ТОЛЬКО JSON-массив, без маркдауна, без пояснений, без бэктиков.
Формат: [{"contractNumber": "...", "clientName": "...", "amount": 0}]
Если поле не найдено, ставь пустую строку или 0.
Если документ не содержит данных о договорах, верни пустой массив [].`,
    messages: [
      {
        role: 'user',
        content: `Распознай данные из этого документа:\n\n${text}`
      }
    ]
  });

  const rawText = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  const cleaned = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error('Claude вернул невалидный JSON:', cleaned);
    throw new Error('Не удалось распознать данные из файла');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Не удалось распознать данные из файла');
  }

  return parsed.map(item => ({
    contractNumber: String(item.contractNumber || '').trim(),
    clientName: String(item.clientName || '').trim(),
    actualAmount: Number(item.amount) || 0
  }));
}

// --- Многоуровневый поиск договора ---

function findContractMatch(item, contracts, clientNameMap) {
  const searchNum = (item.contractNumber || '').trim().toLowerCase();
  const searchName = normalizeNameForCompare(item.clientName);

  // Уровень 1: Точное совпадение номера
  if (searchNum) {
    for (const c of contracts) {
      const cNum = (c.number || '').trim().toLowerCase();
      if (cNum && cNum === searchNum) {
        return { contract: c, confidence: 'exact' };
      }
    }
  }

  // Уровень 2: Частичное совпадение номера (один содержит другой)
  if (searchNum && searchNum.length >= 4) {
    for (const c of contracts) {
      const cNum = (c.number || '').trim().toLowerCase();
      if (!cNum) continue;
      if (cNum.includes(searchNum) || searchNum.includes(cNum)) {
        return { contract: c, confidence: 'partial' };
      }
    }
  }

  // Уровень 3: По имени клиента + частичному номеру
  if (searchName && searchNum) {
    const clientIds = clientNameMap.get(searchName);
    if (clientIds && clientIds.length > 0) {
      for (const c of contracts) {
        const cClientId = String(c.clientId?._id || c.clientId || '');
        if (!clientIds.includes(cClientId)) continue;
        const cNum = (c.number || '').trim().toLowerCase();
        if (cNum && searchNum.length >= 3) {
          // Последние 6+ символов совпадают
          const tail = searchNum.slice(-Math.min(6, searchNum.length));
          if (cNum.includes(tail)) {
            return { contract: c, confidence: 'name_partial' };
          }
        }
      }
    }
  }

  // Уровень 4: Только по имени клиента (если один договор у этого клиента с этой СК)
  if (searchName) {
    const clientIds = clientNameMap.get(searchName);
    if (clientIds && clientIds.length > 0) {
      const matching = contracts.filter(c => {
        const cClientId = String(c.clientId?._id || c.clientId || '');
        return clientIds.includes(cClientId);
      });
      if (matching.length === 1) {
        return { contract: matching[0], confidence: 'name_only' };
      }
    }
  }

  return { contract: null, confidence: 'none' };
}

// --- Сверка с базой ---

async function reconcileItems(parsedItems, userId) {
  // Загружаем все договоры пользователя с номерами
  const contracts = await Contract.find({
    userId
  }).populate('clientId', 'name');

  // Создаём мап имени клиента → массив clientId
  const allClients = await Client.find({ userId }).select('_id name');
  const clientNameMap = new Map();
  for (const cl of allClients) {
    const key = normalizeNameForCompare(cl.name);
    if (!key) continue;
    if (!clientNameMap.has(key)) clientNameMap.set(key, []);
    clientNameMap.get(key).push(String(cl._id));
  }

  return parsedItems.map(item => {
    const { contract, confidence } = findContractMatch(item, contracts, clientNameMap);

    if (!contract) {
      return {
        contractNumber: item.contractNumber,
        clientName: item.clientName,
        expectedAmount: 0,
        actualAmount: item.actualAmount,
        status: 'unknown',
        confidence: 'none',
        contractId: null
      };
    }

    const expectedAmount = contract.commissionAmount || 0;

    return {
      contractNumber: item.contractNumber,
      clientName: item.clientName || (contract.clientId ? contract.clientId.name : ''),
      expectedAmount,
      actualAmount: item.actualAmount,
      status: 'found',
      confidence,
      contractId: contract._id
    };
  });
}

// --- Обновить accrualCommission на договорах после сохранения акта ---

async function updateAccrualCommissions(items, userId) {
  let updated = 0;
  for (const item of items) {
    if (!item.contractId || item.status === 'unknown') continue;
    try {
      await Contract.findOneAndUpdate(
        { _id: item.contractId, userId },
        { $inc: { accrualCommission: item.actualAmount || 0 } }
      );
      updated++;
    } catch (e) {
      console.error('Error updating accrualCommission:', e.message);
    }
  }
  return updated;
}

// --- Определение source по файлу ---

function detectSource(mimetype, originalName) {
  const ext = (originalName || '').toLowerCase().split('.').pop();

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimetype === 'application/vnd.ms-excel' ||
    ext === 'xlsx' || ext === 'xls'
  ) {
    return 'excel';
  }

  if (mimetype === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }

  if (mimetype === 'text/csv' || mimetype === 'application/csv' || ext === 'csv') {
    return 'csv';
  }

  return 'manual';
}

module.exports = {
  extractTextFromFile,
  parseWithClaude,
  reconcileItems,
  updateAccrualCommissions,
  detectSource
};
