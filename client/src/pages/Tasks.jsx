import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import TaskForm from '../components/TaskForm';
import './Tasks.css';

const FILTER_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'done', label: 'Завершённые' }
];

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Новые первые' },
  { value: 'dueDate', label: 'По сроку' },
  { value: '-priority', label: 'По приоритету' }
];

const PRIORITY_MAP = {
  h: { label: 'Высокий', className: 'priority-high' },
  m: { label: 'Средний', className: 'priority-medium' },
  l: { label: 'Низкий', className: 'priority-low' }
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d < today;
}

function Tasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Фильтры
  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('-createdAt');

  // Пагинация
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Модальная форма
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchTasks = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 50, sort };
      if (filter !== 'all') params.filter = filter;

      const res = await api.get('/tasks', { params });
      setTasks(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки задач');
    } finally {
      setLoading(false);
    }
  }, [filter, sort]);

  useEffect(() => {
    fetchTasks(1);
  }, [fetchTasks]);

  const handleCreate = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  const handleToggle = async (taskId) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/toggle`);
      setTasks(prev => prev.map(t => t._id === taskId ? res.data.data : t));
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка переключения');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Удалить задачу?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks(pagination.page);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, data);
      } else {
        await api.post('/tasks', data);
      }
      setShowForm(false);
      setEditingTask(null);
      fetchTasks(pagination.page);
    } catch (err) {
      throw err;
    }
  };

  const handleClientClick = (clientId) => {
    if (clientId) {
      navigate(`/clients/${clientId}`);
    }
  };

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <h1>Задачи</h1>
        <button className="tasks-add-btn" onClick={handleCreate}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Новая задача
        </button>
      </div>

      <div className="tasks-toolbar">
        <div className="tasks-filters">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`tasks-filter-btn ${filter === opt.value ? 'active' : ''}`}
              onClick={() => setFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select className="tasks-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {error && <div className="tasks-error">{error}</div>}

      {loading ? (
        <div className="tasks-loading">Загрузка...</div>
      ) : tasks.length === 0 ? (
        <div className="tasks-empty">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="16" y="16" width="22" height="22" rx="2" transform="rotate(45 27 27)" fill="var(--sec)" opacity="0.2" />
            <path d="M24 32l4 4 8-8" stroke="var(--sec)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="18" y="22" width="28" height="28" rx="4" stroke="var(--sec)" strokeWidth="2" fill="none" />
          </svg>
          <h3>Нет задач</h3>
          <p>
            {filter === 'active' ? 'Все задачи выполнены!' :
             filter === 'done' ? 'Завершённых задач пока нет' :
             'Добавьте первую задачу'}
          </p>
          {filter !== 'done' && (
            <button className="tasks-empty-btn" onClick={handleCreate}>
              Добавить задачу
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="tasks-count">
            Задач: {pagination.total}
          </div>

          <div className="tasks-list">
            {tasks.map(task => {
              const pri = PRIORITY_MAP[task.priority] || PRIORITY_MAP.m;
              const overdue = !task.done && isOverdue(task.dueDate);

              return (
                <div key={task._id} className={`task-item ${task.done ? 'task-done' : ''}`}>
                  <button
                    className={`task-checkbox ${task.done ? 'checked' : ''}`}
                    onClick={() => handleToggle(task._id)}
                    title={task.done ? 'Вернуть' : 'Завершить'}
                  >
                    {task.done && (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  <div className="task-content">
                    <div className="task-title-row">
                      <span className={`task-title ${task.done ? 'task-title-done' : ''}`}>
                        {task.title}
                      </span>
                      <span className={`task-priority ${pri.className}`}>
                        {pri.label}
                      </span>
                    </div>

                    <div className="task-meta">
                      {task.dueDate && (
                        <span className={`task-date ${overdue ? 'task-date-overdue' : ''}`}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                          {formatDate(task.dueDate)}
                          {overdue && ' (просрочено)'}
                        </span>
                      )}

                      {task.clientId && (
                        <span
                          className="task-client"
                          onClick={(e) => { e.stopPropagation(); handleClientClick(task.clientId._id); }}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M3 12c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                          {task.clientId.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="task-actions">
                    <button className="task-action-btn" onClick={() => handleEdit(task)} title="Редактировать">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button className="task-action-btn delete" onClick={() => handleDelete(task._id)} title="Удалить">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {pagination.pages > 1 && (
            <div className="tasks-pagination">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchTasks(pagination.page - 1)}
              >
                Назад
              </button>
              <span>{pagination.page} из {pagination.pages}</span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchTasks(pagination.page + 1)}
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <TaskForm
          task={editingTask}
          onSubmit={handleFormSubmit}
          onClose={() => { setShowForm(false); setEditingTask(null); }}
        />
      )}
    </div>
  );
}

export default Tasks;
