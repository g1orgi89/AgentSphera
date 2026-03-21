const mongoose = require('mongoose');
const Client = require('../models/Client');

/**
 * Получить список клиентов с поиском, фильтрацией, сортировкой и пагинацией
 */
const getClients = async (userId, query = {}) => {
  const { search, status, sort = '-createdAt', page = 1, limit = 20 } = query;

  const filter = { userId };

  // Фильтр по статусу
  if (status && ['active', 'potential', 'inactive'].includes(status)) {
    filter.status = status;
  }

  // Поиск по имени, телефону, email
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

  // Сортировка: "-name" → { name: -1 }, "name" → { name: 1 }
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

  // Проверка дубликатов по имени (case-insensitive, trim)
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
  // Разрешённые поля для обновления
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

  // Каскадное удаление связанных сущностей
  // Модели могут ещё не существовать на ранних этапах разработки
  try {
    const Contract = mongoose.model('Contract');
    await Contract.deleteMany({ userId, clientId });
  } catch (e) {
    // Модель Contract ещё не создана — пропускаем
  }

  try {
    const Task = mongoose.model('Task');
    await Task.deleteMany({ userId, clientId });
  } catch (e) {
    // Модель Task ещё не создана — пропускаем
  }

  try {
    const Note = mongoose.model('Note');
    await Note.deleteMany({ userId, clientId });
  } catch (e) {
    // Модель Note ещё не создана — пропускаем
  }

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

      // Комиссия
      if (c.commissionType === '%') {
        summary.totalCommission += Math.round((c.premium || 0) * (c.commissionValue || 0) / 100);
      } else {
        summary.totalCommission += c.commissionValue || 0;
      }

      // Активный договор: endDate не задана или в будущем
      if (!c.endDate || c.endDate >= now) {
        summary.activeContracts++;
      }

      // Взносы
      if (c.installments && c.installments.length > 0) {
        summary.totalInstallments += c.installments.length;
        summary.totalPaidInstallments += c.installments.filter(i => i.paid).length;
      }
    }
  } catch (e) {
    // Модель Contract ещё не создана — возвращаем нули
  }

  return summary;
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
  getClientSummary
};
