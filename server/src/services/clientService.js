const mongoose = require('mongoose');
const Client = require('../models/Client');

// --- Юридические формы для удаления ---
const LEGAL_FORMS = ['ооо', 'оао', 'зао', 'ао', 'пао', 'ип', 'мбу', 'гбусо', 'гбу', 'муп', 'мку', 'фгуп', 'фгбу', 'гуп', 'нко', 'анко', 'тсж', 'сз'];
// Сортированные по длине (длинные первыми — чтобы "гбусо" проверялось раньше "гбу")
const LEGAL_FORMS_SORTED = [...LEGAL_FORMS].sort((a, b) => b.length - a.length);

function normalizeBasic(name) {
  if (!name) return '';
  let n = String(name).trim();
  n = n.replace(/\s*\[[\d\s]*\]\s*$/g, '');
  n = n.replace(/[«»""'']/g, '');
  n = n.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
  n = n.replace(/\s+/g, ' ');
  return n.toLowerCase().trim();
}

/**
 * Глубокая нормализация — убирает юр. формы, пробелы, пунктуацию
 * "ООО БЛОКСТРОЙ" → "блокстрой"
 * "ОООБЛОКСТРОЙ" → "блокстрой"  (слитно — убирается как префикс)
 * "БЛОКСТРОЙ" → "блокстрой"
 * "СПЕЦ ЭНЕРГО СТРОЙ" → "спецэнергострой"
 */
function normalizeDeep(name) {
  let n = normalizeBasic(name);
  // Шаг 1: убрать юр. формы как отдельные слова
  for (const form of LEGAL_FORMS) {
    n = n.replace(new RegExp('(^|\\s)' + form + '(\\s|$)', 'g'), ' ');
  }
  // Шаг 2: убрать ВСЕ пробелы, точки, дефисы, запятые, скобки
  n = n.replace(/[\s.\-,()]/g, '');
  // Шаг 3: убрать юр. форму как префикс (для слитного написания "оооблокстрой")
  for (const form of LEGAL_FORMS_SORTED) {
    if (n.startsWith(form) && n.length > form.length) {
      n = n.slice(form.length);
      break;
    }
  }
  return n;
}

function extractNameParts(name) {
  const n = normalizeBasic(name);
  const parts = n.split(/\s+/).filter(p => p.length > 0);
  if (parts.length < 2) return null;
  const surname = parts[0];
  const rest = parts.slice(1);
  const initials = [];
  const fullParts = [];
  let hasAbbreviation = false;
  for (const p of rest) {
    const clean = p.replace(/\./g, '');
    if (clean.length === 1) { initials.push(clean); hasAbbreviation = true; }
    else if (clean.length === 2 && !p.includes('.')) { initials.push(clean[0], clean[1]); hasAbbreviation = true; }
    else { fullParts.push(clean); initials.push(clean[0]); }
  }
  return { surname, initials, fullParts, hasAbbreviation };
}

function mergeField(a, b) {
  a = (a || '').trim(); b = (b || '').trim();
  if (!a) return b; if (!b) return a;
  if (a.toLowerCase() === b.toLowerCase()) return a;
  return `${a}, ${b}`;
}

function formatBirthday(date) {
  if (!date) return null;
  try { return new Date(date).toISOString().slice(0, 10); } catch { return null; }
}

// === CRUD операции ===

const getClients = async (userId, query = {}) => {
  const { search, status, sort = '-createdAt', page = 1, limit = 20 } = query;
  const filter = { userId };
  if (status && ['active', 'potential', 'inactive'].includes(status)) filter.status = status;
  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [{ name: { $regex: s, $options: 'i' } }, { phone: { $regex: s, $options: 'i' } }, { email: { $regex: s, $options: 'i' } }];
  }
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;
  const sortObj = {};
  if (sort.startsWith('-')) sortObj[sort.slice(1)] = -1; else sortObj[sort] = 1;
  const [clients, total] = await Promise.all([Client.find(filter).sort(sortObj).skip(skip).limit(limitNum), Client.countDocuments(filter)]);
  return { clients, pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) } };
};

const getClientById = async (userId, clientId) => { return await Client.findOne({ _id: clientId, userId }); };

const createClient = async (userId, data) => {
  const { name, phone, email, birthday, preferredContact, status, note, link } = data;
  let duplicate = null;
  if (name && name.trim()) { duplicate = await Client.findOne({ userId, name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') } }); }
  const client = await Client.create({ userId, name, phone: phone || '', email: email || '', birthday: birthday || null, preferredContact: preferredContact || '', status: status || 'active', note: note || '', link: link || '' });
  return { client, warning: duplicate ? `Клиент с именем "${duplicate.name}" уже существует (ID: ${duplicate._id})` : null };
};

const updateClient = async (userId, clientId, data) => {
  const allowed = ['name', 'phone', 'email', 'birthday', 'preferredContact', 'status', 'note', 'link'];
  const updates = {};
  for (const key of allowed) { if (data[key] !== undefined) updates[key] = data[key]; }
  return await Client.findOneAndUpdate({ _id: clientId, userId }, updates, { new: true, runValidators: true });
};

const deleteClient = async (userId, clientId) => {
  const client = await Client.findOne({ _id: clientId, userId });
  if (!client) return null;
  try { await mongoose.model('Contract').deleteMany({ userId, clientId }); } catch (e) {}
  try { await mongoose.model('Task').deleteMany({ userId, clientId }); } catch (e) {}
  try { await mongoose.model('Note').deleteMany({ userId, clientId }); } catch (e) {}
  await Client.deleteOne({ _id: clientId, userId });
  return client;
};

const getClientSummary = async (userId, clientId) => {
  const summary = { totalPremium: 0, totalCommission: 0, contractCount: 0, activeContracts: 0, totalPaidInstallments: 0, totalInstallments: 0 };
  try {
    const contracts = await mongoose.model('Contract').find({ userId, clientId });
    summary.contractCount = contracts.length;
    const now = new Date();
    for (const c of contracts) {
      summary.totalPremium += c.premium || 0;
      if (c.commissionType === '%') summary.totalCommission += Math.round((c.premium || 0) * (c.commissionValue || 0) / 100);
      else summary.totalCommission += c.commissionValue || 0;
      if (!c.endDate || c.endDate >= now) summary.activeContracts++;
      if (c.installments && c.installments.length > 0) { summary.totalInstallments += c.installments.length; summary.totalPaidInstallments += c.installments.filter(i => i.paid).length; }
    }
  } catch (e) {}
  return summary;
};

// === Нечёткий поиск дубликатов (3 уровня) ===

const findDuplicates = async (userId) => {
  const allClients = await Client.find({ userId }).lean();
  const Contract = mongoose.model('Contract');

  const clientData = allClients.map(c => ({
    ...c,
    basic: normalizeBasic(c.name),
    deep: normalizeDeep(c.name),
    parts: extractNameParts(c.name),
    bd: formatBirthday(c.birthday)
  }));

  const matched = new Set();
  const duplicates = [];

  // Уровень 1+2: группировка по deep ключу
  const deepGroups = {};
  for (const c of clientData) {
    if (!c.deep || c.deep.length < 2) continue;
    if (!deepGroups[c.deep]) deepGroups[c.deep] = [];
    deepGroups[c.deep].push(c);
  }

  for (const [key, clients] of Object.entries(deepGroups)) {
    if (clients.length < 2) continue;
    // Проверяем тёзок
    const subgroups = [];
    for (const c of clients) {
      let placed = false;
      for (const sg of subgroups) {
        const first = sg[0];
        if (first.bd && c.bd && first.bd !== c.bd) continue;
        sg.push(c); placed = true; break;
      }
      if (!placed) subgroups.push([c]);
    }
    for (const sg of subgroups) {
      if (sg.length < 2) continue;
      for (const c of sg) matched.add(String(c._id));
      duplicates.push({
        normalizedName: key, matchType: 'deep',
        clients: sg.map(c => ({ _id: c._id, name: c.name, phone: c.phone, email: c.email, birthday: c.birthday, status: c.status, createdAt: c.createdAt }))
      });
    }
  }

  // Уровень 3: сокращения
  const withParts = clientData.filter(c => c.parts && !matched.has(String(c._id)));
  const abbreviated = withParts.filter(c => c.parts.hasAbbreviation);
  const fullNames = withParts.filter(c => !c.parts.hasAbbreviation && c.parts.fullParts.length >= 1);

  for (const abbr of abbreviated) {
    for (const full of fullNames) {
      if (matched.has(String(abbr._id)) && matched.has(String(full._id))) continue;
      if (abbr.parts.surname !== full.parts.surname) continue;
      const abbrInit = abbr.parts.initials.join('');
      const fullInit = full.parts.initials.join('');
      if (abbrInit !== fullInit) continue;
      if (abbr.bd && full.bd && abbr.bd !== full.bd) continue;
      matched.add(String(abbr._id)); matched.add(String(full._id));
      duplicates.push({
        normalizedName: abbr.parts.surname, matchType: 'abbreviation',
        clients: [
          { _id: full._id, name: full.name, phone: full.phone, email: full.email, birthday: full.birthday, status: full.status, createdAt: full.createdAt },
          { _id: abbr._id, name: abbr.name, phone: abbr.phone, email: abbr.email, birthday: abbr.birthday, status: abbr.status, createdAt: abbr.createdAt }
        ]
      });
    }
  }

  for (const group of duplicates) {
    for (const client of group.clients) {
      client.contractCount = await Contract.countDocuments({ userId, clientId: client._id });
    }
  }

  duplicates.sort((a, b) => b.clients.length - a.clients.length);
  return duplicates;
};

// === Объединение клиентов ===

const mergeClients = async (userId, keepId, removeId) => {
  const keepClient = await Client.findOne({ _id: keepId, userId });
  const removeClient = await Client.findOne({ _id: removeId, userId });
  if (!keepClient || !removeClient) { const err = new Error('Один из клиентов не найден'); err.statusCode = 404; throw err; }
  if (keepId === removeId) { const err = new Error('Нельзя объединить клиента с самим собой'); err.statusCode = 400; throw err; }

  let updated = false;
  const newPhone = mergeField(keepClient.phone, removeClient.phone);
  if (newPhone !== keepClient.phone) { keepClient.phone = newPhone; updated = true; }
  const newEmail = mergeField(keepClient.email, removeClient.email);
  if (newEmail !== keepClient.email) { keepClient.email = newEmail; updated = true; }
  if (!keepClient.birthday && removeClient.birthday) { keepClient.birthday = removeClient.birthday; updated = true; }
  const newNote = mergeField(keepClient.note, removeClient.note);
  if (newNote !== keepClient.note) { keepClient.note = newNote; updated = true; }
  if (!keepClient.link && removeClient.link) { keepClient.link = removeClient.link; updated = true; }
  if (updated) await keepClient.save();

  try { await mongoose.model('Contract').updateMany({ userId, clientId: removeId }, { $set: { clientId: keepId } }); } catch (e) {}
  try { await mongoose.model('Task').updateMany({ userId, clientId: removeId }, { $set: { clientId: keepId } }); } catch (e) {}
  try { await mongoose.model('Note').updateMany({ userId, clientId: removeId }, { $set: { clientId: keepId } }); } catch (e) {}

  await Client.deleteOne({ _id: removeId, userId });
  return keepClient;
};

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

module.exports = { getClients, getClientById, createClient, updateClient, deleteClient, getClientSummary, findDuplicates, mergeClients };
