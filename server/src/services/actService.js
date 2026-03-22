const ExcelJS = require('exceljs');
const Anthropic = require('@anthropic-ai/sdk');
const Contract = require('../models/Contract');

// --- Извлечение текста из файла ---

async function extractTextFromFile(buffer, mimetype, originalName) {
  const ext = (originalName || '').toLowerCase().split('.').pop();

  // Excel
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimetype === 'application/vnd.ms-excel' ||
    ext === 'xlsx' || ext === 'xls'
  ) {
    return await extractFromExcel(buffer);
  }

  // PDF
  if (mimetype === 'application/pdf' || ext === 'pdf') {
    return await extractFromPdf(buffer);
  }

  // CSV
  if (
    mimetype === 'text/csv' ||
    mimetype === 'application/csv' ||
    ext === 'csv'
  ) {
    return buffer.toString('utf-8');
  }

  throw new Error('Неподдерживаемый формат файла');
}

async function extractFromExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const lines = [];
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      const cells = [];
      row.eachCell({ includeEmpty: true }, (cell) => {
        const val = cell.value;
        if (val === null || val === undefined) {
          cells.push('');
        } else if (typeof val === 'object' && val.result !== undefined) {
          // Формулы
          cells.push(String(val.result));
        } else if (val instanceof Date) {
          cells.push(val.toLocaleDateString('ru-RU'));
        } else {
          cells.push(String(val));
        }
      });
      lines.push(cells.join(' | '));
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
- amount — сумма комиссии (агентское вознаграждение / КВ). Если нет явной комиссии, используй итоговую сумму.

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

  // Извлекаем текст ответа
  const rawText = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  // Очищаем от возможных бэктиков
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

  // Нормализуем результат
  return parsed.map(item => ({
    contractNumber: String(item.contractNumber || '').trim(),
    clientName: String(item.clientName || '').trim(),
    actualAmount: Number(item.amount) || 0
  }));
}

// --- Сверка с базой ---

async function reconcileItems(parsedItems, userId) {
  // Загружаем все договоры пользователя с номерами
  const contracts = await Contract.find({
    userId,
    number: { $ne: '' }
  }).populate('clientId', 'name');

  // Создаём мап по номеру (lowercase) для быстрого поиска
  const contractMap = new Map();
  contracts.forEach(c => {
    const num = (c.number || '').trim().toLowerCase();
    if (num) {
      contractMap.set(num, c);
    }
  });

  return parsedItems.map(item => {
    const searchNum = (item.contractNumber || '').trim().toLowerCase();
    const contract = searchNum ? contractMap.get(searchNum) : null;

    if (!contract) {
      return {
        contractNumber: item.contractNumber,
        clientName: item.clientName,
        expectedAmount: 0,
        actualAmount: item.actualAmount,
        status: 'unknown'
      };
    }

    // Вычисляем ожидаемую КВ из договора
    const expectedAmount = contract.commissionAmount || 0;
    const diff = Math.abs(expectedAmount - item.actualAmount);

    return {
      contractNumber: item.contractNumber,
      clientName: item.clientName || (contract.clientId ? contract.clientId.name : ''),
      expectedAmount,
      actualAmount: item.actualAmount,
      status: diff < 1 ? 'ok' : 'diff'
    };
  });
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
  detectSource
};
