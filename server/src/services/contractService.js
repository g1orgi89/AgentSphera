const Contract = require('../models/Contract');
const Client = require('../models/Client');

/**
 * Получить список договоров с поиском, фильтрацией, сортировкой и пагинацией
 */
const getContracts = async (userId, query = {}) => {
  const {
    search,
    clientId,
    company,
    type,
    objectType,
    status,
    sort = '-createdAt',
    page = 1,
    limit = 20
  } = query;

  const filter = { userId };

  // Фильтр по клиенту
  if (clientId) {
    filter.clientId = clientId;
  }

  // Фильтр по страховой компании
  if (company && company.trim()) {
    filter.company = { $regex: company.trim(), $options: 'i' };
  }

  // Фильтр по типу договора
  if (type && type.trim()) {
    filter.type = { $regex: type.trim(), $options: 'i' };
  }

  // Фильтр по типу объекта
  if (objectType && ['auto', 'realty', 'life'].includes(objectType)) {
    filter.objectType = objectType;
  }

  // Фильтр по статусу (виртуальное поле — фильтруем через даты)
  if (status) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (status === 'expired') {
      filter.endDate = { $ne: null, $lt: now };
    } else if (status === 'expiring_7') {
      const in7 = new Date(now);
      in7.setDate(in7.getDate() + 7);
      filter.endDate = { $ne: null, $gte: now, $lte: in7 };
    } else if (status === 'expiring_14') {
      const in14 = new Date(now);
      in14.setDate(in14.getDate() + 14);
      filter.endDate = { $ne: null, $gte: now, $lte: in14 };
    } else if (status === 'expiring_30') {
      const in30 = new Date(now);
      in30.setDate(in30.getDate() + 30);
      filter.endDate = { $ne: null, $gte: now, $lte: in30 };
    } else if (status === 'active') {
      const in30 = new Date(now);
      in30.setDate(in30.getDate() + 30);
      filter.$or = [
        { endDate: null },
        { endDate: { $gt: in30 } }
      ];
    }
  }

  // Поиск по номеру, СК, типу
  if (search && search.trim()) {
    const s = search.trim();
    const searchConditions = [
      { company: { $regex: s, $options: 'i' } },
      { number: { $regex: s, $options: 'i' } },
      { type: { $regex: s, $options: 'i' } }
    ];

    // Поиск по имени клиента — находим clientId
    const matchingClients = await Client.find({
      userId,
      name: { $regex: s, $options: 'i' }
    }).select('_id');

    if (matchingClients.length > 0) {
      searchConditions.push({
        clientId: { $in: matchingClients.map(c => c._id) }
      });
    }

    // Если уже есть $or от фильтра статуса, комбинируем через $and
    if (filter.$or) {
      const statusOr = filter.$or;
      delete filter.$or;
      filter.$and = [
        { $or: statusOr },
        { $or: searchConditions }
      ];
    } else {
      filter.$or = searchConditions;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  // Сортировка: "-premium" → { premium: -1 }
  const sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.slice(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const [contracts, total] = await Promise.all([
    Contract.find(filter)
      .populate('clientId', 'name phone email')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum),
    Contract.countDocuments(filter)
  ]);

  return {
    contracts,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
};

/**
 * Получить договор по ID (только своего)
 */
const getContractById = async (userId, contractId) => {
  const contract = await Contract.findOne({ _id: contractId, userId })
    .populate('clientId', 'name phone email status');
  return contract;
};

/**
 * Создать договор
 */
const createContract = async (userId, data) => {
  const {
    clientId,
    company,
    number,
    type,
    startDate,
    endDate,
    objectType,
    objectData,
    premium,
    commissionType,
    commissionValue,
    installments,
    note,
    link
  } = data;

  // Проверяем что клиент существует и принадлежит пользователю
  const client = await Client.findOne({ _id: clientId, userId });
  if (!client) {
    const err = new Error('Клиент не найден');
    err.statusCode = 404;
    throw err;
  }

  const contract = await Contract.create({
    userId,
    clientId,
    company,
    number: number || '',
    type,
    startDate: startDate || null,
    endDate: endDate || null,
    objectType: objectType || '',
    objectData: objectData || {},
    premium,
    commissionType: commissionType || '%',
    commissionValue: commissionValue || 0,
    installments: installments || [],
    note: note || '',
    link: link || ''
  });

  // Populate clientId для ответа
  await contract.populate('clientId', 'name phone email');

  return contract;
};

/**
 * Обновить договор
 */
const updateContract = async (userId, contractId, data) => {
  const allowed = [
    'clientId', 'company', 'number', 'type',
    'startDate', 'endDate', 'objectType', 'objectData',
    'premium', 'commissionType', 'commissionValue',
    'installments', 'note', 'link'
  ];

  const updates = {};
  for (const key of allowed) {
    if (data[key] !== undefined) {
      updates[key] = data[key];
    }
  }

  // Если меняется clientId — проверяем что новый клиент принадлежит пользователю
  if (updates.clientId) {
    const client = await Client.findOne({ _id: updates.clientId, userId });
    if (!client) {
      const err = new Error('Клиент не найден');
      err.statusCode = 404;
      throw err;
    }
  }

  const contract = await Contract.findOneAndUpdate(
    { _id: contractId, userId },
    updates,
    { new: true, runValidators: true }
  ).populate('clientId', 'name phone email');

  return contract;
};

/**
 * Удалить договор
 */
const deleteContract = async (userId, contractId) => {
  const contract = await Contract.findOne({ _id: contractId, userId });

  if (!contract) {
    return null;
  }

  await Contract.deleteOne({ _id: contractId, userId });

  return contract;
};

/**
 * Обновить статус взноса (paid: true/false)
 */
const updateInstallment = async (userId, contractId, installmentIdx, data) => {
  const contract = await Contract.findOne({ _id: contractId, userId });

  if (!contract) {
    return null;
  }

  const idx = parseInt(installmentIdx, 10);

  if (isNaN(idx) || idx < 0 || idx >= contract.installments.length) {
    const err = new Error('Взнос не найден');
    err.statusCode = 404;
    throw err;
  }

  const installment = contract.installments[idx];

  if (data.paid !== undefined) {
    installment.paid = data.paid;
    installment.paidDate = data.paid ? (data.paidDate || new Date()) : null;
  }

  if (data.amount !== undefined) {
    installment.amount = data.amount;
  }

  if (data.dueDate !== undefined) {
    installment.dueDate = data.dueDate;
  }

  await contract.save();
  await contract.populate('clientId', 'name phone email');

  return contract;
};

/**
 * Итого: суммы, средний чек, КВ
 */
const getTotals = async (userId, query = {}) => {
  const { company, type, objectType, status } = query;

  const filter = { userId };

  if (company && company.trim()) {
    filter.company = { $regex: company.trim(), $options: 'i' };
  }

  if (type && type.trim()) {
    filter.type = { $regex: type.trim(), $options: 'i' };
  }

  if (objectType && ['auto', 'realty', 'life'].includes(objectType)) {
    filter.objectType = objectType;
  }

  if (status) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    if (status === 'expired') {
      filter.endDate = { $ne: null, $lt: now };
    } else if (status === 'expiring_30') {
      const in30 = new Date(now);
      in30.setDate(in30.getDate() + 30);
      filter.endDate = { $ne: null, $gte: now, $lte: in30 };
    } else if (status === 'active') {
      const in30 = new Date(now);
      in30.setDate(in30.getDate() + 30);
      filter.$or = [
        { endDate: null },
        { endDate: { $gt: in30 } }
      ];
    }
  }

  const contracts = await Contract.find(filter);

  let totalPremium = 0;
  let totalCommission = 0;
  let totalPaidInstallments = 0;
  let totalInstallments = 0;

  for (const c of contracts) {
    totalPremium += c.premium || 0;

    // Комиссия
    if (c.commissionType === '%') {
      totalCommission += Math.round((c.premium || 0) * (c.commissionValue || 0) / 100);
    } else {
      totalCommission += c.commissionValue || 0;
    }

    // Взносы
    if (c.installments && c.installments.length > 0) {
      totalInstallments += c.installments.length;
      totalPaidInstallments += c.installments.filter(i => i.paid).length;
    }
  }

  const count = contracts.length;

  return {
    count,
    totalPremium,
    totalCommission,
    averagePremium: count > 0 ? Math.round(totalPremium / count) : 0,
    totalInstallments,
    totalPaidInstallments
  };
};

module.exports = {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
  updateInstallment,
  getTotals
};
