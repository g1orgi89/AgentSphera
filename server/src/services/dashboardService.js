const mongoose = require('mongoose');
const Contract = require('../models/Contract');
const Client = require('../models/Client');
const Task = require('../models/Task');

/**
 * Вычислить комиссию без вызова toJSON (lean-совместимо)
 */
function calcCommission(c) {
  if (c.commissionType === '%') return Math.round((c.premium || 0) * (c.commissionValue || 0) / 100);
  return c.commissionValue || 0;
}

function getDateRange(period) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  switch (period) {
    case 'month': return { start: new Date(now.getFullYear(), now.getMonth(), 1) };
    case 'quarter': { const qMonth = Math.floor(now.getMonth() / 3) * 3; return { start: new Date(now.getFullYear(), qMonth, 1) }; }
    case 'year': return { start: new Date(now.getFullYear(), 0, 1) };
    default: return { start: null };
  }
}

async function getStats(userId, period) {
  const dateRange = getDateRange(period);
  const match = { userId: new mongoose.Types.ObjectId(userId) };
  if (dateRange.start) match.startDate = { $gte: dateRange.start };

  // Агрегация вместо загрузки всех документов
  const agg = await Contract.aggregate([
    { $match: match },
    { $addFields: {
      commissionAmount: { $cond: { if: { $eq: ['$commissionType', '%'] }, then: { $round: [{ $multiply: [{ $ifNull: ['$premium', 0] }, { $divide: [{ $ifNull: ['$commissionValue', 0] }, 100] }] }, 0] }, else: { $ifNull: ['$commissionValue', 0] } } }
    }},
    { $group: {
      _id: null,
      totalPremium: { $sum: { $ifNull: ['$premium', 0] } },
      totalCommission: { $sum: '$commissionAmount' },
      contractCount: { $sum: 1 }
    }}
  ]);

  const stats = agg[0] || { totalPremium: 0, totalCommission: 0, contractCount: 0 };

  // Просроченные взносы через агрегацию
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const debtAgg = await Contract.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: '$installments' },
    { $match: { 'installments.paid': false, 'installments.dueDate': { $lt: now } } },
    { $group: { _id: null, totalDebt: { $sum: '$installments.amount' }, count: { $sum: 1 } } }
  ]);

  const instAgg = await Contract.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $unwind: '$installments' },
    { $group: {
      _id: null,
      total: { $sum: 1 },
      paid: { $sum: { $cond: ['$installments.paid', 1, 0] } }
    }}
  ]);

  const clientCount = await Client.countDocuments({ userId });

  return {
    totalPremium: stats.totalPremium,
    totalCommission: stats.totalCommission,
    clientCount,
    totalDebt: debtAgg[0]?.totalDebt || 0,
    contractCount: stats.contractCount,
    totalPaidInstallments: instAgg[0]?.paid || 0,
    totalInstallments: instAgg[0]?.total || 0
  };
}

async function getAlerts(userId) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const in7days = new Date(now); in7days.setDate(in7days.getDate() + 7);
  const in30days = new Date(now); in30days.setDate(in30days.getDate() + 30);

  // Истекающие договоры (только нужные, не все)
  const expiringRaw = await Contract.find({
    userId,
    endDate: { $ne: null, $gte: now, $lte: in30days }
  }).populate('clientId', 'name').lean();

  const expiringContracts = expiringRaw.map(c => ({
    contractId: c._id,
    contractNumber: c.number || '',
    company: c.company,
    type: c.type,
    clientName: c.clientId?.name || '—',
    clientId: c.clientId?._id || null,
    endDate: c.endDate,
    daysUntil: Math.ceil((new Date(c.endDate).setHours(0,0,0,0) - now) / (1000*60*60*24))
  })).sort((a, b) => a.daysUntil - b.daysUntil);

  // Взносы: просроченные и на неделе
  const withInstallments = await Contract.find({
    userId,
    'installments.paid': false
  }).select('number company installments clientId').populate('clientId', 'name').lean();

  const overdueInstallments = [];
  const upcomingInstallments = [];

  for (const c of withInstallments) {
    const clientName = c.clientId?.name || '—';
    const clientId = c.clientId?._id || null;
    for (const inst of (c.installments || [])) {
      if (inst.paid) continue;
      const due = new Date(inst.dueDate); due.setHours(0,0,0,0);
      if (due < now) {
        overdueInstallments.push({ contractId: c._id, contractNumber: c.number || '', company: c.company, clientName, clientId, amount: inst.amount, dueDate: inst.dueDate, daysOverdue: Math.ceil((now - due) / (1000*60*60*24)) });
      } else if (due <= in7days) {
        upcomingInstallments.push({ contractId: c._id, contractNumber: c.number || '', company: c.company, clientName, clientId, amount: inst.amount, dueDate: inst.dueDate, daysUntil: Math.ceil((due - now) / (1000*60*60*24)) });
      }
    }
  }

  // Задачи на сегодня
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
  const todayTasks = await Task.find({ userId, done: false, dueDate: { $lte: todayEnd } }).populate('clientId', 'name').sort({ dueDate: 1 }).lean();

  return {
    overdueInstallments: overdueInstallments.sort((a, b) => b.daysOverdue - a.daysOverdue),
    overdueTotal: overdueInstallments.reduce((s, i) => s + (i.amount || 0), 0),
    upcomingInstallments: upcomingInstallments.sort((a, b) => a.daysUntil - b.daysUntil),
    expiringContracts,
    todayTasks: todayTasks.map(t => ({ taskId: t._id, title: t.title, priority: t.priority, dueDate: t.dueDate, clientName: t.clientId?.name || null, clientId: t.clientId?._id || null }))
  };
}

async function getByCompany(userId) {
  const result = await Contract.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $addFields: {
      commissionAmount: { $cond: { if: { $eq: ['$commissionType', '%'] }, then: { $round: [{ $multiply: [{ $ifNull: ['$premium', 0] }, { $divide: [{ $ifNull: ['$commissionValue', 0] }, 100] }] }, 0] }, else: { $ifNull: ['$commissionValue', 0] } } }
    }},
    { $group: {
      _id: { $ifNull: ['$company', 'Без СК'] },
      totalPremium: { $sum: { $ifNull: ['$premium', 0] } },
      totalCommission: { $sum: '$commissionAmount' },
      count: { $sum: 1 }
    }},
    { $project: { _id: 0, company: '$_id', totalPremium: 1, totalCommission: 1, count: 1 } },
    { $sort: { totalPremium: -1 } }
  ]);
  return result;
}

async function getByType(userId) {
  const result = await Contract.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $addFields: {
      commissionAmount: { $cond: { if: { $eq: ['$commissionType', '%'] }, then: { $round: [{ $multiply: [{ $ifNull: ['$premium', 0] }, { $divide: [{ $ifNull: ['$commissionValue', 0] }, 100] }] }, 0] }, else: { $ifNull: ['$commissionValue', 0] } } }
    }},
    { $group: {
      _id: { $ifNull: ['$type', 'Без типа'] },
      totalPremium: { $sum: { $ifNull: ['$premium', 0] } },
      totalCommission: { $sum: '$commissionAmount' },
      count: { $sum: 1 }
    }},
    { $project: { _id: 0, type: '$_id', totalPremium: 1, totalCommission: 1, count: 1 } },
    { $sort: { totalPremium: -1 } }
  ]);
  return result;
}

async function getUpcoming(userId) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const in30days = new Date(now); in30days.setDate(in30days.getDate() + 30);

  const tasks = await Task.find({ userId, done: false, dueDate: { $gte: now, $lte: in30days } }).populate('clientId', 'name').sort({ dueDate: 1 }).lean();

  const clients = await Client.find({ userId, birthday: { $ne: null } }).lean();
  const birthdays = [];
  for (const client of clients) {
    if (!client.birthday) continue;
    const bd = new Date(client.birthday);
    const thisYearBd = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
    if (thisYearBd < now) thisYearBd.setFullYear(thisYearBd.getFullYear() + 1);
    const diffDays = Math.ceil((thisYearBd - now) / (1000*60*60*24));
    if (diffDays <= 30) {
      birthdays.push({ clientId: client._id, clientName: client.name, birthday: client.birthday, daysUntil: diffDays, date: thisYearBd });
    }
  }
  birthdays.sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    tasks: tasks.map(t => ({ taskId: t._id, title: t.title, priority: t.priority, dueDate: t.dueDate, clientName: t.clientId?.name || null, clientId: t.clientId?._id || null })),
    birthdays
  };
}

module.exports = { getStats, getAlerts, getByCompany, getByType, getUpcoming };
