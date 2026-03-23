const Task = require('../models/Task');
const Client = require('../models/Client');

/**
 * Получить список задач с фильтрацией, сортировкой и пагинацией
 */
const getTasks = async (userId, query = {}) => {
  const { filter, clientId, sort = '-createdAt', page = 1, limit = 50 } = query;

  const dbFilter = { userId };

  // Фильтр по клиенту
  if (clientId) {
    dbFilter.clientId = clientId;
  }

  // Фильтр: all / active / done
  if (filter === 'active') {
    dbFilter.done = false;
  } else if (filter === 'done') {
    dbFilter.done = true;
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  // Сортировка
  const sortObj = {};
  if (sort.startsWith('-')) {
    sortObj[sort.slice(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const [tasks, total] = await Promise.all([
    Task.find(dbFilter)
      .populate('clientId', 'name phone')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum),
    Task.countDocuments(dbFilter)
  ]);

  return {
    tasks,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    }
  };
};

/**
 * Получить задачу по ID
 */
const getTaskById = async (userId, taskId) => {
  const task = await Task.findOne({ _id: taskId, userId })
    .populate('clientId', 'name phone');
  return task;
};

/**
 * Создать задачу
 */
const createTask = async (userId, data) => {
  const { title, dueDate, priority, clientId, done } = data;

  // Если указан клиент — проверяем что он существует и принадлежит пользователю
  if (clientId) {
    const client = await Client.findOne({ _id: clientId, userId });
    if (!client) {
      const err = new Error('Клиент не найден');
      err.statusCode = 404;
      throw err;
    }
  }

  const task = await Task.create({
    userId,
    clientId: clientId || null,
    title,
    dueDate: dueDate || null,
    priority: priority || 'm',
    done: done || false
  });

  await task.populate('clientId', 'name phone');

  return task;
};

/**
 * Обновить задачу
 */
const updateTask = async (userId, taskId, data) => {
  const allowed = ['title', 'dueDate', 'priority', 'clientId', 'done'];
  const updates = {};

  for (const key of allowed) {
    if (data[key] !== undefined) {
      updates[key] = data[key];
    }
  }

  // Если меняется clientId — проверяем
  if (updates.clientId) {
    const client = await Client.findOne({ _id: updates.clientId, userId });
    if (!client) {
      const err = new Error('Клиент не найден');
      err.statusCode = 404;
      throw err;
    }
  }

  // Разрешаем явно обнулить clientId
  if (data.clientId === null) {
    updates.clientId = null;
  }

  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId },
    updates,
    { new: true, runValidators: true }
  ).populate('clientId', 'name phone');

  return task;
};

/**
 * Переключить done
 */
const toggleTask = async (userId, taskId) => {
  const task = await Task.findOne({ _id: taskId, userId });

  if (!task) {
    return null;
  }

  task.done = !task.done;
  await task.save();
  await task.populate('clientId', 'name phone');

  return task;
};

/**
 * Удалить задачу
 */
const deleteTask = async (userId, taskId) => {
  const task = await Task.findOne({ _id: taskId, userId });

  if (!task) {
    return null;
  }

  await Task.deleteOne({ _id: taskId, userId });

  return task;
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  toggleTask,
  deleteTask
};
