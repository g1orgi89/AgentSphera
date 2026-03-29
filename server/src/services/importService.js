const XLSX = require('xlsx');
const Client = require('../models/Client');
const Contract = require('../models/Contract');

const HEADER_MAP = {
  'фио': 'clientName', 'клиент': 'clientName', 'имя': 'clientName',
  'телефон': 'clientPhone', 'тел': 'clientPhone', 'phone': 'clientPhone',
  'э-почта': 'clientEmail', 'email': 'clientEmail', 'почта': 'clientEmail',
  'эл. почта': 'clientEmail', 'эл.почта': 'clientEmail',
  'др': 'clientBirthday', 'дата рождения': 'clientBirthday', 'день рождения': 'clientBirthday',
  'ск': 'company', 'страховая': 'company', 'компания': 'company',
  'договор': 'number', 'номер договора': 'number', '№': 'number', 'номер': 'number',
  'вид договора': 'type', 'вид': 'type', 'тип': 'type',
  'начало': 'startDate', 'дата начала': 'startDate',
  'окончание': 'endDate', 'дата окончания': 'endDate',
  'премия': 'premium', 'сумма': 'premium',
  'марка': 'carMark', 'авто': 'carMark', 'автомобиль': 'carMark',
  'гос знак': 'plate', 'госзнак': 'plate', 'гос. знак': 'plate', 'номер авто': 'plate',
  'вин': 'vin', 'vin': 'vin',
  'примечание': 'note', 'комментарий': 'note',
  'комиссия': 'commission', 'кв': 'commission',
  'адрес': 'address', 'площадь': 'area',
  'застрахованный': 'insured', 'возраст': 'age', 'страховая сумма': 'sumInsured'
};

function normalizeName(name) {
  if (!name) return '';
  let n = String(name).trim();
  n = n.replace(/\s*\[[\d\s]*\]\s*$/g, '');
  n = n.replace(/[«»""'']/g, '');
  n = n.replace(/\s+/g, ' ');
  return n.trim();
}

function normalizeNameForCompare(name) {
  return normalizeName(name).toLowerCase();
}

function formatBD(date) {
  if (!date) return null;
  try { return new Date(date).toISOString().slice(0, 10); } catch { return null; }
}

function detectObjectType(type) {
  if (!type) return null;
  const t = type.toLowerCase().trim();
  if (['каско', 'осаго', 'дсаго', 'авто'].some(k => t.includes(k))) return 'auto';
  if (['ипотека', 'имущество', 'недвижимость', 'квартира', 'дом'].some(k => t.includes(k))) return 'realty';
  if (['нс', 'жизнь', 'дмс', 'здоровье', 'несчастн'].some(k => t.includes(k))) return 'life';
  return null;
}

function parseDate(val) {
  if (!val) return null;
  if (typeof val === 'number') { const d = XLSX.SSF.parse_date_code(val); if (d) return new Date(d.y, d.m - 1, d.d); return null; }
  const s = String(val).trim();
  if (!s) return null;
  const dmy = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  if (dmy) { let y = parseInt(dmy[3]); if (y < 100) y += 2000; return new Date(y, parseInt(dmy[2]) - 1, parseInt(dmy[1])); }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return val;
  const s = String(val).replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function cleanString(val) { if (val === null || val === undefined) return ''; return String(val).trim(); }
function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function looksLikeName(val) { if (!val || typeof val !== 'string') return false; const s = val.trim(); return s.length >= 3 && /[а-яА-ЯёЁ]/.test(s) && /\s/.test(s); }

function getSheetNames(buffer) { const wb = XLSX.read(buffer, { type: 'buffer' }); return wb.SheetNames; }

function parseSheet(buffer, sheetName) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`Лист "${sheetName}" не найден`);
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  if (raw.length < 2) return { mapping: {}, rows: [] };

  let headerRow = 0;
  for (let i = 0; i < Math.min(raw.length, 5); i++) {
    const textCells = raw[i].filter(c => typeof c === 'string' && c.trim().length > 0);
    if (textCells.length >= 3) { headerRow = i; break; }
  }

  const headers = raw[headerRow].map(h => cleanString(h));
  const mapping = {};
  const usedFields = new Set();

  headers.forEach((h, idx) => {
    const key = h.toLowerCase().replace(/[\s.]+/g, ' ').trim();
    if (!key) return;
    if (HEADER_MAP[key] && !usedFields.has(HEADER_MAP[key])) { mapping[idx] = { field: HEADER_MAP[key], header: h }; usedFields.add(HEADER_MAP[key]); return; }
    for (const [pattern, field] of Object.entries(HEADER_MAP)) {
      if (usedFields.has(field)) continue;
      if (key.includes(pattern) || pattern.includes(key)) { mapping[idx] = { field, header: h }; usedFields.add(field); return; }
    }
  });

  if (!usedFields.has('clientName')) {
    for (let idx = 0; idx < headers.length; idx++) {
      if (mapping[idx]) continue;
      if (headers[idx].trim().length > 3) continue;
      let nameCount = 0;
      for (let r = headerRow + 1; r < Math.min(raw.length, headerRow + 6); r++) { if (looksLikeName(raw[r][idx])) nameCount++; }
      if (nameCount >= 2) { mapping[idx] = { field: 'clientName', header: 'ФИО (авто)' }; usedFields.add('clientName'); break; }
    }
  }

  const rows = [];
  for (let i = headerRow + 1; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;
    const parsed = {};
    for (const [colIdx, { field }] of Object.entries(mapping)) {
      const val = row[parseInt(colIdx)];
      if (val === '' || val === null || val === undefined) continue;
      if (['startDate', 'endDate', 'clientBirthday'].includes(field)) parsed[field] = parseDate(val);
      else if (['premium', 'commission', 'area', 'age', 'sumInsured'].includes(field)) parsed[field] = parseNumber(val);
      else parsed[field] = cleanString(val);
    }
    if (parsed.clientName) parsed.clientName = normalizeName(parsed.clientName);
    if (parsed.startDate && parsed.endDate && new Date(parsed.endDate) < new Date(parsed.startDate)) {
      const tmp = parsed.startDate; parsed.startDate = parsed.endDate; parsed.endDate = tmp;
    }
    if (!parsed.clientName && !parsed.number && !parsed.company) continue;
    rows.push(parsed);
  }

  return { mapping: Object.values(mapping).reduce((acc, m) => { acc[m.field] = m.header; return acc; }, {}), rows };
}

async function saveImport(rows, userId) {
  const results = { created: 0, skipped: 0, errors: [], clientsCreated: 0, clientsFound: 0 };

  const allClients = await Client.find({ userId });
  const clientMap = new Map();
  for (const c of allClients) {
    const key = normalizeNameForCompare(c.name);
    if (!key) continue;
    if (!clientMap.has(key)) clientMap.set(key, []);
    clientMap.get(key).push(c);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      let clientId = null;

      if (row.clientName) {
        const normalizedSearch = normalizeNameForCompare(row.clientName);
        const candidates = clientMap.get(normalizedSearch) || [];
        let client = null;

        if (candidates.length > 0) {
          const rowBD = formatBD(row.clientBirthday);
          if (rowBD) {
            client = candidates.find(c => {
              const cbd = formatBD(c.birthday);
              return !cbd || cbd === rowBD;
            });
          } else {
            client = candidates[0];
          }
        }

        if (client) {
          results.clientsFound++;
          let updated = false;
          if (!client.phone && row.clientPhone) { client.phone = row.clientPhone; updated = true; }
          if (!client.email && row.clientEmail) { client.email = row.clientEmail; updated = true; }
          if (!client.birthday && row.clientBirthday) { client.birthday = row.clientBirthday; updated = true; }
          if (updated) await client.save();
          clientId = client._id;
        } else {
          const cleanName = normalizeName(row.clientName);
          if (cleanName.length < 2) { results.skipped++; results.errors.push({ row: i + 1, error: `Имя "${row.clientName}" слишком короткое` }); continue; }
          const newClient = await Client.create({ userId, name: cleanName, phone: row.clientPhone || '', email: row.clientEmail || '', birthday: row.clientBirthday || null, status: 'active' });
          clientId = newClient._id;
          results.clientsCreated++;
          if (!clientMap.has(normalizedSearch)) clientMap.set(normalizedSearch, []);
          clientMap.get(normalizedSearch).push(newClient);
        }
      }

      if (!clientId) { results.skipped++; results.errors.push({ row: i + 1, error: 'Нет имени клиента' }); continue; }

      // Проверка дубликата: номер + СК + премия + даты + тип
      if (row.number) {
        const dupeFilter = { userId, number: { $regex: new RegExp('^' + escapeRegex(row.number) + '$', 'i') } };
        if (row.company) dupeFilter.company = { $regex: new RegExp('^' + escapeRegex(row.company) + '$', 'i') };
        if (row.premium !== null && row.premium !== undefined) dupeFilter.premium = row.premium;
        if (row.startDate) dupeFilter.startDate = row.startDate;
        if (row.endDate) dupeFilter.endDate = row.endDate;
        if (row.type) dupeFilter.type = { $regex: new RegExp('^' + escapeRegex(row.type) + '$', 'i') };
        const existing = await Contract.findOne(dupeFilter);
        if (existing) { results.skipped++; continue; }
      }

      const objectType = detectObjectType(row.type);
      const objectData = {};
      if (objectType === 'auto') { if (row.carMark) objectData.car = row.carMark; if (row.plate) objectData.plate = row.plate; if (row.vin) objectData.vin = row.vin; }
      else if (objectType === 'realty') { if (row.address) objectData.address = row.address; if (row.area) objectData.area = row.area; }
      else if (objectType === 'life') { if (row.insured) objectData.insured = row.insured; if (row.age) objectData.age = row.age; if (row.sumInsured) objectData.sumInsured = row.sumInsured; }

      const contractData = { userId, clientId, company: row.company || '', number: row.number || '', type: row.type || '', startDate: row.startDate || null, endDate: row.endDate || null, premium: row.premium || 0, commissionType: 'fix', commissionValue: row.commission || 0, note: row.note || '', installments: [] };
      if (objectType) { contractData.objectType = objectType; contractData.objectData = objectData; }

      await Contract.create(contractData);
      results.created++;
    } catch (err) {
      results.errors.push({ row: i + 1, error: err.message });
    }
  }

  return results;
}

module.exports = { getSheetNames, parseSheet, saveImport, normalizeName, normalizeNameForCompare };
