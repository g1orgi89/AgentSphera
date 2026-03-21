import { useState, useEffect } from 'react';
import ClientPicker from './ClientPicker';

const PRIORITY_OPTIONS = [
  { value: 'h', label: 'Высокий' },
  { value: 'm', label: 'Средний' },
  { value: 'l', label: 'Низкий' }
];

function TaskForm({ task, fixedClient, onSubmit, onClose }) {
  const [form, setForm] = useState({
    title: '',
    dueDate: '',
    priority: 'm',
    clientId: null
  });
  const [selectedClient, setSelectedClient] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || '',
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        priority: task.priority || 'm',
        clientId: task.clientId?._id || task.clientId || null
      });
      if (task.clientId && typeof task.clientId === 'object') {
        setSelectedClient(task.clientId);
      }
    } else if (fixedClient) {
      setForm(prev => ({ ...prev, clientId: fixedClient._id }));
      setSelectedClient(fixedClient);
    }
  }, [task, fixedClient]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleClientChange = (client) => {
    setSelectedClient(client);
    setForm(prev => ({ ...prev, clientId: client ? client._id : null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title.trim()) {
      setError('Введите название задачи');
      return;
    }

    if (form.title.trim().length < 2) {
      setError('Название должно быть не менее 2 символов');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        title: form.title.trim(),
        priority: form.priority,
        clientId: form.clientId || null
      };
      if (form.dueDate) {
        data.dueDate = form.dueDate;
      } else {
        data.dueDate = null;
      }
      await onSubmit(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="task-form-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="task-form-modal">
        <div className="task-form-header">
          <h2>{task ? 'Редактировать задачу' : 'Новая задача'}</h2>
          <button type="button" className="task-form-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <div className="task-form-field">
            <label>Название *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Что нужно сделать?"
              autoFocus
            />
          </div>

          <div className="task-form-field">
            <label>Срок</label>
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
            />
          </div>

          <div className="task-form-field">
            <label>Приоритет</label>
            <select name="priority" value={form.priority} onChange={handleChange}>
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="task-form-field">
            <label>Клиент</label>
            {fixedClient ? (
              <div className="client-picker-selected">
                <span>{fixedClient.name}</span>
              </div>
            ) : (
              <ClientPicker
                value={selectedClient}
                onChange={handleClientChange}
              />
            )}
          </div>

          {error && <div className="task-form-error">{error}</div>}

          <div className="task-form-actions">
            <button type="button" className="task-form-cancel" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="task-form-submit" disabled={submitting}>
              {submitting ? 'Сохранение...' : (task ? 'Сохранить' : 'Создать')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskForm;
