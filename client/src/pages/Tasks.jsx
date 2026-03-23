import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../store/ToastContext';
import TaskForm from '../components/TaskForm';
import { BurgerButton } from '../components/Layout';
import './Tasks.css';

const FILTER_OPTIONS = [
  { value: 'all', label: 'Все' },
  { value: 'active', label: 'Активные' },
  { value: 'done', label: 'Завершённые' }
];

const SORT_OPTIONS = [
  { value: 'dueDate', label: 'По дате' },
  { value: '-createdAt', label: 'Новые первые' },
  { value: 'priority', label: 'По приоритету' }
];

const PRIORITY_MAP = {
  h: { label: 'Высокий', className: 'priority-high' },
  m: { label: 'Средний', className: 'priority-medium' },
  l: { label: 'Низкий', className: 'priority-low' }
};

function Tasks() {
  const navigate = useNavigate();
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState('active');
  const [sort, setSort] = useState('dueDate');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchTasks = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { filter, sort, page, limit: 20 };
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

  const handleFormSubmit = async (data) => {
    try {
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, data);
        toast.success('Задача обновлена');
      } else {
        await api.post('/tasks', data);
        toast.success('Задача добавлена');
      }
      setShowForm(false);
      setEditingTask(null);
      fetchTasks(pagination.page);
    } catch (err) {
      throw err;
    }
  };

  const handleToggle = async (taskId) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/toggle`);
      setTasks(prev => prev.map(t => t._id === taskId ? res.data.data : t));
      toast.success(res.data.data.done ? 'Задача завершена' : 'Задача возобновлена');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка переключения');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Удалить задачу?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      toast.success('Задача удалена');
      fetchTasks(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit'
    });
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  const goToClient = (task) => {
    const cid = typeof task.clientId === 'object' ? task.clientId?._id : task.clientId;
    if (cid) navigate(`/clients/${cid}`);
  };

  const getClientName = (task) => {
    if (typeof task.clientId === 'object' && task.clientId?.name) {
      return task.clientId.name;
    }
    return null;
  };

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <BurgerButton />
        <h1>Задачи</h1>
        <button className="tasks-add-btn" onClick={handleCreate}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Добавить задачу
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
            <rect x="16" y="12" width="32" height="40" rx="3" stroke="var(--sec)" strokeWidth="2" fill="none" opacity="0.3" />
            <path d="M24 28l5 5 11-11" stroke="var(--sec)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3" />
          </svg>
          <h3>Нет задач</h3>
          <p>{filter === 'done' ? 'Нет завершённых задач' : 'Добавьте первую задачу'}</p>
          {filter !== 'done' && (
            <button className="tasks-empty-btn" onClick={handleCreate}>
              Добавить задачу
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="tasks-count">Найдено: {pagination.total}</div>

          <div className="tasks-list">
            {tasks.map(task => {
              const pri = PRIORITY_MAP[task.priority] || PRIORITY_MAP.m;
              const overdue = !task.done && isOverdue(task.dueDate);
              const clientName = getClientName(task);

              return (
                <div key={task._id} className={`task-item ${task.done ? 'task-done' : ''}`}>
                  <button
                    className={`task-checkbox ${task.done ? 'checked' : ''}`}
                    onClick={() => handleToggle(task._id)}
                  >
                    {task.done && (
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
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
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                          </svg>
                          {formatDate(task.dueDate)}
                          {overdue && ' (просрочено)'}
                        </span>
                      )}
                      {clientName && (
                        <span className="task-client" onClick={() => goToClient(task)}>
                          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                            <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M2 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.2" />
                          </svg>
                          {clientName}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="task-actions">
                    <button className="task-action-btn" onClick={() => handleEdit(task)} title="Редактировать">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="currentColor" strokeWidth="1.2" fill="none" />
                      </svg>
                    </button>
                    <button className="task-action-btn delete" onClick={() => handleDelete(task._id)} title="Удалить">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
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
