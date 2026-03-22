const Contract = require('../models/Contract');
const Client = require('../models/Client');
const Task = require('../models/Task');

// --- Помощник: диапазон дат по периоду ---

function getDateRange(period) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  switch (period) {
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start };
    }
    case 'quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      return { start };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start };
    }
    default:
      return { start: null };
  }
}

// --- GET /dashboard/stats ---

async function getStats(userId, period) {
  const dateRange = getDateRange(period);
  const match = { userId };

  // Если указан период, фильтруем по startDate
  if (dateRange.start) {
    match.startDate = { $gte: dateRange.start };
  }

  const contracts = await Contract.find(match);

  let totalPremium = 0;
  let totalCommission = 0;
  let totalDebt = 0;
  let totalPaidInstallments = 0;
  let totalInstallments = 0;

  contracts.forEach(c => {
    const cJSON = c.toJSON();
    totalPremium += c.premium || 0;
    totalCommission += cJSON.commissionAmount || 0;

    (c.installments || []).forEach(inst => {
      totalInstallments++;
      if (inst.paid) {
        totalPaidInstallments++;
      } else {
        const due = new Date(inst.dueDate);
        due.setHours(0, 0, 0, 0);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (due < now) {
          totalDebt += inst.amount || 0;
        }
      }
    });
  });

  const clientCount = await Client.countDocuments({ userId });

  return {
    totalPremium,
    totalCommission,
    clientCount,
    totalDebt,
    contractCount: contracts.length,
    totalPaidInstallments,
    totalInstallments
  };
}

// --- GET /dashboard/alerts ---

async function getAlerts(userId) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const in7days = new Date(now);
  in7days.setDate(in7days.getDate() + 7);
  const in30days = new Date(now);
  in30days.setDate(in30days.getDate() + 30);

  const contracts = await Contract.find({ userId }).populate('clientId', 'name');

  // Просроченные взносы
  const overdueInstallments = [];
  // Взносы на неделе
  const upcomingInstallments = [];
  // Истекающие договоры
  const expiringContracts = [];

  contracts.forEach(c => {
    const clientName = c.clientId ? c.clientId.name : '—';
    const clientId = c.clientId ? c.clientId._id : null;

    // Взносы
    (c.installments || []).forEach((inst, idx) => {
      if (inst.paid) return;
      const due = new Date(inst.dueDate);
      due.setHours(0, 0, 0, 0);

      if (due < now) {
        overdueInstallments.push({
          contractId: c._id,
          contractNumber: c.number || '',
          company: c.company,
          clientName,
          clientId,
          amount: inst.amount,
          dueDate: inst.dueDate,
          daysOverdue: Math.ceil((now - due) / (1000 * 60 * 60 * 24))
        });
      } else if (due <= in7days) {
        upcomingInstallments.push({
          contractId: c._id,
          contractNumber: c.number || '',
          company: c.company,
          clientName,
          clientId,
          amount: inst.amount,
          dueDate: inst.dueDate,
          daysUntil: Math.ceil((due - now) / (1000 * 60 * 60 * 24))
        });
      }
    });

    // Истекающие договоры (30 дней)
    if (c.endDate) {
      const end = new Date(c.endDate);
      end.setHours(0, 0, 0, 0);
      if (end >= now && end <= in30days) {
        expiringContracts.push({
          contractId: c._id,
          contractNumber: c.number || '',
          company: c.company,
          type: c.type,
          clientName,
          clientId,
          endDate: c.endDate,
          daysUntil: Math.ceil((end - now) / (1000 * 60 * 60 * 24))
        });
      }
    }
  });

  // Задачи на сегодня
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const todayTasks = await Task.find({
    userId,
    done: false,
    dueDate: { $lte: todayEnd }
  }).populate('clientId', 'name').sort({ dueDate: 1 });

  const todayTasksData = todayTasks.map(t => ({
    taskId: t._id,
    title: t.title,
    priority: t.priority,
    dueDate: t.dueDate,
    clientName: t.clientId ? t.clientId.name : null,
    clientId: t.clientId ? t.clientId._id : null
  }));

  return {
    overdueInstallments: overdueInstallments.sort((a, b) => b.daysOverdue - a.daysOverdue),
    overdueTotal: overdueInstallments.reduce((s, i) => s + (i.amount || 0), 0),
    upcomingInstallments: upcomingInstallments.sort((a, b) => a.daysUntil - b.daysUntil),
    expiringContracts: expiringContracts.sort((a, b) => a.daysUntil - b.daysUntil),
    todayTasks: todayTasksData
  };
}

// --- GET /dashboard/by-company ---

async function getByCompany(userId) {
  const contracts = await Contract.find({ userId });

  const map = {};
  contracts.forEach(c => {
    const key = c.company || 'Без СК';
    if (!map[key]) {
      map[key] = { company: key, totalPremium: 0, totalCommission: 0, count: 0 };
    }
    const cJSON = c.toJSON();
    map[key].totalPremium += c.premium || 0;
    map[key].totalCommission += cJSON.commissionAmount || 0;
    map[key].count++;
  });

  return Object.values(map).sort((a, b) => b.totalPremium - a.totalPremium);
}

// --- GET /dashboard/by-type ---

async function getByType(userId) {
  const contracts = await Contract.find({ userId });

  const map = {};
  contracts.forEach(c => {
    const key = c.type || 'Без типа';
    if (!map[key]) {
      map[key] = { type: key, totalPremium: 0, totalCommission: 0, count: 0 };
    }
    const cJSON = c.toJSON();
    map[key].totalPremium += c.premium || 0;
    map[key].totalCommission += cJSON.commissionAmount || 0;
    map[key].count++;
  });

  return Object.values(map).sort((a, b) => b.totalPremium - a.totalPremium);
}

// --- GET /dashboard/upcoming ---

async function getUpcoming(userId) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const in30days = new Date(now);
  in30days.setDate(in30days.getDate() + 30);

  // Задачи на месяц
  const tasks = await Task.find({
    userId,
    done: false,
    dueDate: { $gte: now, $lte: in30days }
  }).populate('clientId', 'name').sort({ dueDate: 1 });

  const upcomingTasks = tasks.map(t => ({
    taskId: t._id,
    title: t.title,
    priority: t.priority,
    dueDate: t.dueDate,
    clientName: t.clientId ? t.clientId.name : null,
    clientId: t.clientId ? t.clientId._id : null
  }));

  // Дни рождения на месяц
  const clients = await Client.find({ userId, birthday: { $ne: null } });

  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const nextMonth = (currentMonth + 1) % 12;

  const birthdays = [];
  clients.forEach(client => {
    if (!client.birthday) return;
    const bd = new Date(client.birthday);
    const bdMonth = bd.getMonth();
    const bdDay = bd.getDate();

    // Проверяем ближайшие 30 дней
    const thisYearBd = new Date(now.getFullYear(), bdMonth, bdDay);
    if (thisYearBd < now) {
      thisYearBd.setFullYear(thisYearBd.getFullYear() + 1);
    }

    const diffDays = Math.ceil((thisYearBd - now) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      birthdays.push({
        clientId: client._id,
        clientName: client.name,
        birthday: client.birthday,
        daysUntil: diffDays,
        date: thisYearBd
      });
    }
  });

  birthdays.sort((a, b) => a.daysUntil - b.daysUntil);

  return {
    tasks: upcomingTasks,
    birthdays
  };
}

module.exports = {
  getStats,
  getAlerts,
  getByCompany,
  getByType,
  getUpcoming
};
