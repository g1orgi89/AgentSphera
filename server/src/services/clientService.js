const mongoose = require('mongoose');
const Client = require('../models/Client');

/**
 * Нормализация имени для поиска дубликатов
 */
function normalizeForCompare(name) {
  if (!name) return '';
  let n = String(name).trim();
  n = n.replace(/\s*\[[\d\s]*\]\s*$/g, '');
  n = n.replace(/[«»""'']/g, '');
  n = n.replace(/\s+/g, ' ');
  return n.toLowerCase().trim();
}

/**
 * Получить список клиентов с поиском, фильтрацией, сортировкой и пагинацией
 */
const getClients = async (userId, query = {}) => {
  const { search, status, sort = '-createdAt', page = 1, limit = 20 } = query;

  const filter = { userId };

  if (status && ['active', 'potential', 'inactive'].includes(status)) {
    filter.status = status;
  }

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { name: { $regex: s, $options: 'i' } },
      { phone: { $regex: s, $options: 'i' } },
      { email: { $regex: s, $options: 'i' } }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.slice(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const [clients, total] = await Promise.all([
    Client.find(filter).sort(sortObj).skip(skip).limit(limitNum),
    Client.countDocuments(filter)
  ]);

  return {
    clients,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
};

/**
 * Получить клиента по ID (только своего)
 */
const getClientById = async (userId, clientId) => {
  const client = await Client.findOne({ _id: clientId, userId });
  return client;
};

/**
 * Создать клиента с проверкой дубликатов (предупреждение, не блокировка)
 */
const createClient = async (userId, data) => {
  const { name, phone, email, birthday, preferredContact, status, note, link } = data;

  let duplicate = null;
  if (name && name.trim()) {
    duplicate = await Client.findOne({
      userId,
      name: { $regex: new RegExp(`^${escapeRegex(name.trim())}$`, 'i') }
    });
  }

  const client = await Client.create({
    userId,
    name,
    phone: phone || '',
    email: email || '',
    birthday: birthday || null,
    preferredContact: preferredContact || '',
    status: status || 'active',
    note: note || '',
    link: link || ''
  });

  return {
    client,
    warning: duplicate
      ? `Клиент с именем "${duplicate.name}" уже существует (ID: ${duplicate._id})`
      : null
  };
};

/**
 * Обновить клиента
 */
const updateClient = async (userId, clientId, data) => {
  const allowed = ['name', 'phone', 'email', 'birthday', 'preferredContact', 'status', 'note', 'link'];
  const updates = {};

  for (const key of allowed) {
    if (data[key] !== undefined) {
      updates[key] = data[key];
    }
  }

  const client = await Client.findOneAndUpdate(
    { _id: clientId, userId },
    updates,
    { new: true, runValidators: true }
  );

  return client;
};

/**
 * Удалить клиента + каскадное удаление договоров, задач, заметок
 */
const deleteClient = async (userId, clientId) => {
  const client = await Client.findOne({ _id: clientId, userId });

  if (!client) {
    return null;
  }

  try {
    const Contract = mongoose.model('Contract');
    await Contract.deleteMany({ userId, clientId });
  } catch (e) {}

  try {
    const Task = mongoose.model('Task');
    await Task.deleteMany({ userId, clientId });
  } catch (e) {}

  try {
    const Note = mongoose.model('Note');
    await Note.deleteMany({ userId, clientId });
  } catch (e) {}

  await Client.deleteOne({ _id: clientId, userId });

  return client;
};

/**
 * Сводка клиента: общая премия, КВ, кол-во договоров
 */
const getClientSummary = async (userId, clientId) => {
  const summary = {
    totalPremium: 0,
    totalCommission: 0,
    contractCount: 0,
    activeContracts: 0,
    totalPaidInstallments: 0,
    totalInstallments: 0
  };

  try {
    const Contract = mongoose.model('Contract');
    const contracts = await Contract.find({ userId, clientId });

    summary.contractCount = contracts.length;

    const now = new Date();

    for (const c of contracts) {
      summary.totalPremium += c.premium || 0;

      if (c.commissionType === '%') {
        summary.totalCommission += Math.round((c.premium || 0) * (c.commissionValue || 0) / 100);
      } else {
        summary.totalCommission += c.commissionValue || 0;
      }

      if (!c.endDate || c.endDate >= now) {
        summary.activeContracts++;
      }

      if (c.installments && c.installments.length > 0) {
        summary.totalInstallments += c.installments.length;
        summary.totalPaidInstallments += c.installments.filter(i => i.paid).length;
      }
    }
  } catch (e) {}

  return summary;
};

/**
 * Найти дубликаты клиентов (похожие имена)
 */
const findDuplicates = async (userId) => {
  const allClients = await Client.find({ userId }).lean();

  // Группируем по нормализованному имени
  const groups = {};
  for (const client of allClients) {
    const key = normalizeForCompare(client.name);
    if (!key) continue;
    if (!groups[key]) groups[key] = [];
    groups[key].push(client);
  }

  // Оставляем только группы с 2+ клиентами
  const duplicates = [];
  for (const [normalizedName, clients] of Object.entries(groups)) {
    if (clients.length < 2) continue;
    // Проверяем что имена действительно разные (не полные дубликаты)
    duplicates.push({
      normalizedName,
      clients: clients.map(c => ({
        _id: c._id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        status: c.status,
        createdAt: c.createdAt
      }))
    });
  }

  // Подгружаем кол-во договоров для каждого клиента
  const Contract = mongoose.model('Contract');
  for (const group of duplicates) {
    for (const client of group.clients) {
      client.contractCount = await Contract.countDocuments({ userId, clientId: client._id });
    }
  }

  // Сортируем: группы с большим кол-вом клиентов сначала
  duplicates.sort((a, b) => b.clients.length - a.clients.length);

  return duplicates;
};

/**
 * Объединить двух клиентов: все связанные данные переносятся на keepId, removeId удаляется
 */
const mergeClients = async (userId, keepId, removeId) => {
  // Проверяем что оба клиента существуют и принадлежат пользователю
  const keepClient = await Client.findOne({ _id: keepId, userId });
  const removeClient = await Client.findOne({ _id: removeId, userId });

  if (!keepClient || !removeClient) {
    const err = new Error('Один из клиентов не найден');
    err.statusCode = 404;
    throw err;
  }

  if (keepId === removeId) {
    const err = new Error('Нельзя объединить клиента с самим собой');
    err.statusCode = 400;
    throw err;
  }

  // Перенести пустые поля с удаляемого клиента
  let updated = false;
  if (!keepClient.phone && removeClient.phone) { keepClient.phone = removeClient.phone; updated = true; }
  if (!keepClient.email && removeClient.email) { keepClient.email = removeClient.email; updated = true; }
  if (!keepClient.birthday && removeClient.birthday) { keepClient.birthday = removeClient.birthday; updated = true; }
  if (!keepClient.note && removeClient.note) { keepClient.note = removeClient.note; updated = true; }
  if (!keepClient.link && removeClient.link) { keepClient.link = removeClient.link; updated = true; }
  if (updated) await keepClient.save();

  // Перенести все договоры
  try {
    const Contract = mongoose.model('Contract');
    await Contract.updateMany(
      { userId, clientId: removeId },
      { $set: { clientId: keepId } }
    );
  } catch (e) {}

  // Перенести все задачи
  try {
    const Task = mongoose.model('Task');
    await Task.updateMany(
      { userId, clientId: removeId },
      { $set: { clientId: keepId } }
    );
  } catch (e) {}

  // Перенести все заметки
  try {
    const Note = mongoose.model('Note');
    await Note.updateMany(
      { userId, clientId: removeId },
      { $set: { clientId: keepId } }
    );
  } catch (e) {}

  // Удалить дубликат
  await Client.deleteOne({ _id: removeId, userId });

  return keepClient;
};

/**
 * Экранирование спецсимволов для RegExp
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientSummary,
  findDuplicates,
  mergeClients
};
