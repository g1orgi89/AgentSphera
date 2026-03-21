import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import ClientForm from '../components/ClientForm';
import ContractForm from '../components/ContractForm';
import TaskForm from '../components/TaskForm';
import './ClientDetail.css';

const STATUS_LABELS = {
  active: 'Активный',
  potential: 'Потенциальный',
  inactive: 'Неактивный'
};

const CONTRACT_STATUS_LABELS = {
  active: 'Действующий',
  expiring_7: 'Истекает',
  expiring_14: 'Истекает',
  expiring_30: 'Истекает',
  expired: 'Истёк'
};

const CONTRACT_STATUS_CLASS = {
  active: 'cd-contract-status-active',
  expiring_7: 'cd-contract-status-danger',
  expiring_14: 'cd-contract-status-warning',
  expiring_30: 'cd-contract-status-warning',
  expired: 'cd-contract-status-danger'
};

const PRIORITY_MAP = {
  h: { label: 'Высокий', className: 'cd-task-priority-high' },
  m: { label: 'Средний', className: 'cd-task-priority-medium' },
  l: { label: 'Низкий', className: 'cd-task-priority-low' }
};

function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Модальные формы
  const [showEditForm, setShowEditForm] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [linkSaving, setLinkSaving] = useState(false);

  // Договоры
  const [contracts, setContracts] = useState([]);
  const [showContractForm, setShowContractForm] = useState(false);
  const [editingContract, setEditingContract] = useState(null);

  // Заметки
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [noteAdding, setNoteAdding] = useState(false);

  // Задачи
  const [clientTasks, setClientTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const fetchClient = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [clientRes, summaryRes] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get(`/clients/${id}/summary`)
      ]);
      setClient(clientRes.data.data);
      setSummary(summaryRes.data.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Клиент не найден');
      } else {
        setError(err.response?.data?.error || 'Ошибка загрузки');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchContracts = useCallback(async () => {
    try {
      const res = await api.get('/contracts', {
        params: { search: '', limit: 100 }
      });
      // Фильтруем по clientId на клиенте (API возвращает все договоры пользователя)
      const all = res.data.data || [];
      const clientContracts = all.filter(c => {
        const cid = typeof c.clientId === 'object' ? c.clientId._id : c.clientId;
        return cid === id;
      });
      setContracts(clientContracts);
    } catch {
      // Не критично
    }
  }, [id]);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await api.get(`/clients/${id}/notes`);
      setNotes(res.data.data);
    } catch {
      // Молча — заметки не критичны
    }
  }, [id]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks', {
        params: { filter: 'all', limit: 100, sort: 'dueDate' }
      });
      const all = res.data.data || [];
      const filtered = all.filter(t => {
        const cid = typeof t.clientId === 'object' ? t.clientId?._id : t.clientId;
        return cid === id;
      });
      setClientTasks(filtered);
    } catch {
      // Не критично
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
    fetchContracts();
    fetchNotes();
    fetchTasks();
  }, [fetchClient, fetchContracts, fetchNotes, fetchTasks]);

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    setNoteAdding(true);
    try {
      await api.post(`/clients/${id}/notes`, { text: noteText.trim() });
      setNoteText('');
      fetchNotes();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка добавления заметки');
    } finally {
      setNoteAdding(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      await api.delete(`/notes/${noteId}`);
      fetchNotes();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления заметки');
    }
  };

  const handleEditSubmit = async (data) => {
    try {
      await api.put(`/clients/${id}`, data);
      setShowEditForm(false);
      fetchClient();
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Удалить клиента? Все его договоры, задачи и заметки будут удалены.')) {
      return;
    }
    try {
      await api.delete(`/clients/${id}`);
      navigate('/clients');
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const handleLinkSave = async () => {
    setLinkSaving(true);
    try {
      await api.put(`/clients/${id}`, { link: linkValue });
      setShowLinkForm(false);
      fetchClient();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения ссылки');
    } finally {
      setLinkSaving(false);
    }
  };

  const openLinkForm = () => {
    setLinkValue(client?.link || '');
    setShowLinkForm(true);
  };

  // --- Договоры: CRUD ---

  const handleContractSubmit = async (payload) => {
    if (editingContract) {
      await api.put(`/contracts/${editingContract._id}`, payload);
    } else {
      await api.post('/contracts', payload);
    }
    setShowContractForm(false);
    setEditingContract(null);
    fetchContracts();
    fetchClient(); // Обновляем сводку
  };

  const handleContractEdit = (contract) => {
    setEditingContract(contract);
    setShowContractForm(true);
  };

  const handleContractDelete = async (contractId) => {
    if (!window.confirm('Удалить договор?')) return;
    try {
      await api.delete(`/contracts/${contractId}`);
      fetchContracts();
      fetchClient(); // Обновляем сводку
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления договора');
    }
  };

  const handleInstallmentToggle = async (contractId, idx, currentPaid) => {
    try {
      await api.patch(`/contracts/${contractId}/installments/${idx}`, {
        paid: !currentPaid
      });
      fetchContracts();
      fetchClient(); // Обновляем сводку
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обновления взноса');
    }
  };

  // --- Задачи: CRUD ---

  const handleTaskSubmit = async (data) => {
    try {
      // Привязываем к текущему клиенту
      const payload = { ...data, clientId: id };
      if (editingTask) {
        await api.put(`/tasks/${editingTask._id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      setShowTaskForm(false);
      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      throw err;
    }
  };

  const handleTaskEdit = (task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleTaskToggle = async (taskId) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/toggle`);
      setClientTasks(prev => prev.map(t => t._id === taskId ? res.data.data : t));
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка переключения');
    }
  };

  const handleTaskDelete = async (taskId) => {
    if (!window.confirm('Удалить задачу?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchTasks();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка удаления задачи');
    }
  };

  // --- Форматирование ---

  const formatBirthday = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const formatCurrency = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString('ru-RU');
  };

  const getContractStatusLabel = (contract) => {
    const label = CONTRACT_STATUS_LABELS[contract.status] || contract.status;
    if (contract.status && contract.status.startsWith('expiring') && contract.endDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const end = new Date(contract.endDate);
      end.setHours(0, 0, 0, 0);
      const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      return `${label} (${days} дн.)`;
    }
    return label;
  };

  const getInstallmentStatus = (inst) => {
    if (inst.paid) return { label: 'Оплачен', cls: 'cd-inst-paid' };
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(inst.dueDate);
    due.setHours(0, 0, 0, 0);
    const diffMs = due - now;
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days < 0) return { label: `Просрочен (${Math.abs(days)} дн.)`, cls: 'cd-inst-overdue' };
    if (days <= 7) return { label: `Скоро (${days} дн.)`, cls: 'cd-inst-soon' };
    return { label: 'Ожидание', cls: 'cd-inst-waiting' };
  };

  const isTaskOverdue = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < today;
  };

  if (loading) {
    return (
      <div className="cd-page">
        <div className="cd-loading">Загрузка...</div>
      </div>
    );
  }

  if (error && !client) {
    return (
      <div className="cd-page">
        <div className="cd-error-block">
          <p>{error}</p>
          <Link to="/clients" className="cd-back-link">← К списку клиентов</Link>
        </div>
      </div>
    );
  }

  if (!client) return null;

  const activeTasksCount = clientTasks.filter(t => !t.done).length;

  return (
    <div className="cd-page">
      {/* Навигация */}
      <Link to="/clients" className="cd-back-link">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Клиенты
      </Link>

      {error && <div className="cd-error">{error}</div>}

      {/* Шапка */}
      <div className="cd-header">
        <div className="cd-avatar">
          {client.name.charAt(0).toUpperCase()}
        </div>
        <div className="cd-header-info">
          <div className="cd-header-top">
            <h1 className="cd-name">{client.name}</h1>
            <span className={`cd-status ${client.status}`}>
              {STATUS_LABELS[client.status] || client.status}
            </span>
          </div>

          <div className="cd-contacts">
            {client.phone && (
              <a href={`tel:${client.phone}`} className="cd-contact">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.5 2h3l1 3-1.5 1.5a8 8 0 003.5 3.5L11 8.5l3 1v3c0 .6-.4 1-1 1A12 12 0 012.5 3c0-.6.4-1 1-1z" stroke="currentColor" strokeWidth="1.2" fill="none" />
                </svg>
                {client.phone}
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} className="cd-contact">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="3.5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                  <path d="M2 5l6 4 6-4" stroke="currentColor" strokeWidth="1.2" fill="none" />
                </svg>
                {client.email}
              </a>
            )}
            {client.preferredContact && (
              <span className="cd-contact cd-contact-pref">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" fill="none" />
                  <path d="M8 5v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                </svg>
                {client.preferredContact}
              </span>
            )}
            {client.birthday && (
              <span className="cd-contact">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="5" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                  <path d="M5 3v4M11 3v4M2 8h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                </svg>
                {formatBirthday(client.birthday)}
              </span>
            )}
          </div>
        </div>

        <div className="cd-header-actions">
          <button className="cd-btn-edit" onClick={() => setShowEditForm(true)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="currentColor" strokeWidth="1.2" fill="none" />
            </svg>
            Изменить
          </button>
          <button className="cd-btn-delete" onClick={handleDelete}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 4h10M6 4V3h4v1M5 4v8.5a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            </svg>
            Удалить
          </button>
        </div>
      </div>

      {/* Заметка клиента */}
      {client.note && (
        <div className="cd-note">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2H5a1.5 1.5 0 00-1.5 1.5v9A1.5 1.5 0 005 14h6a1.5 1.5 0 001.5-1.5V5.5L10 2z" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <path d="M6 8h4M6 10.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span>{client.note}</span>
        </div>
      )}

      {/* Ссылка на документы */}
      <div className="cd-docs">
        <div className="cd-docs-left">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2H5a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7l-5-5z" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <path d="M10 2v5h5" stroke="currentColor" strokeWidth="1.2" fill="none" />
          </svg>
          {client.link ? (
            <a href={client.link} target="_blank" rel="noopener noreferrer" className="cd-docs-link">
              Документы клиента
            </a>
          ) : (
            <span className="cd-docs-empty">Нет ссылки на документы</span>
          )}
        </div>
        <button className="cd-docs-btn" onClick={openLinkForm}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="currentColor" strokeWidth="1.2" fill="none" />
          </svg>
          {client.link ? 'Изменить' : 'Добавить'}
        </button>
      </div>

      {/* Сводка */}
      {summary && (
        <div className="cd-summary">
          <div className="cd-summary-card">
            <span className="cd-summary-value cd-summary-accent">{formatCurrency(summary.totalPremium)}</span>
            <span className="cd-summary-label">Общая премия</span>
          </div>
          <div className="cd-summary-card">
            <span className="cd-summary-value">{formatCurrency(summary.totalCommission)}</span>
            <span className="cd-summary-label">Общая КВ</span>
          </div>
          <div className="cd-summary-card">
            <span className="cd-summary-value cd-summary-sec">{summary.totalPaidInstallments}/{summary.totalInstallments}</span>
            <span className="cd-summary-label">Взносов оплачено</span>
          </div>
          <div className="cd-summary-card">
            <span className="cd-summary-value">{summary.activeContracts}/{summary.contractCount}</span>
            <span className="cd-summary-label">Активных</span>
          </div>
        </div>
      )}

      {/* Договоры */}
      <div className="cd-section">
        <div className="cd-section-header">
          <h2>Договоры ({contracts.length})</h2>
          <button
            className="cd-section-add-btn"
            onClick={() => { setEditingContract(null); setShowContractForm(true); }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Договор
          </button>
        </div>

        {contracts.length === 0 ? (
          <div className="cd-section-empty">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="6" width="24" height="28" rx="2" stroke="var(--sec)" strokeWidth="1.5" fill="none" opacity="0.4" />
              <path d="M14 14h12M14 19h12M14 24h8" stroke="var(--sec)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            </svg>
            <p>У клиента нет договоров</p>
            <button
              className="cd-section-empty-btn"
              onClick={() => { setEditingContract(null); setShowContractForm(true); }}
            >
              Добавить договор
            </button>
          </div>
        ) : (
          <div className="cd-contracts-list">
            {contracts.map(contract => (
              <div key={contract._id} className="cd-contract-card">
                <div className="cd-contract-top">
                  <div className="cd-contract-info">
                    <div className="cd-contract-title">
                      <span className="cd-contract-company">{contract.company}</span>
                      <span className="cd-contract-type">{contract.type}</span>
                    </div>
                    {contract.number && (
                      <div className="cd-contract-number">#{contract.number}</div>
                    )}
                  </div>
                  <span className={`cd-contract-status ${CONTRACT_STATUS_CLASS[contract.status] || ''}`}>
                    {getContractStatusLabel(contract)}
                  </span>
                </div>

                <div className="cd-contract-details">
                  <div className="cd-contract-detail">
                    <span className="cd-contract-detail-label">Период</span>
                    <span>{formatDate(contract.startDate) || '—'} — {formatDate(contract.endDate) || '—'}</span>
                  </div>
                  <div className="cd-contract-detail">
                    <span className="cd-contract-detail-label">Премия</span>
                    <span>{formatCurrency(contract.premium)} ₽</span>
                  </div>
                  <div className="cd-contract-detail">
                    <span className="cd-contract-detail-label">КВ</span>
                    <span className="cd-contract-commission">{formatCurrency(contract.commissionAmount)} ₽</span>
                  </div>
                  {contract.objectType && (
                    <div className="cd-contract-detail">
                      <span className="cd-contract-detail-label">Объект</span>
                      <span>
                        {contract.objectType === 'auto' && (contract.objectData?.car || 'Авто')}
                        {contract.objectType === 'realty' && (contract.objectData?.realtyType || 'Недвижимость')}
                        {contract.objectType === 'life' && (contract.objectData?.insured || 'Жизнь')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Взносы */}
                {contract.installments && contract.installments.length > 0 && (
                  <div className="cd-contract-installments">
                    {contract.installments.map((inst, idx) => {
                      const instStatus = getInstallmentStatus(inst);
                      return (
                        <button
                          key={inst._id || idx}
                          className={`cd-inst-tag ${instStatus.cls}`}
                          onClick={() => handleInstallmentToggle(contract._id, idx, inst.paid)}
                          title={`Клик: ${inst.paid ? 'отменить оплату' : 'отметить оплаченным'}`}
                        >
                          {formatCurrency(inst.amount)} ₽ · {formatDate(inst.dueDate)} · {instStatus.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Документы договора */}
                {contract.link && (
                  <a href={contract.link} target="_blank" rel="noopener noreferrer" className="cd-contract-link">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 2H5a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V5l-3-3z" stroke="currentColor" strokeWidth="1.2" fill="none" />
                    </svg>
                    Документы
                  </a>
                )}

                <div className="cd-contract-actions">
                  <button className="cd-contract-action-btn" onClick={() => handleContractEdit(contract)}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="currentColor" strokeWidth="1.2" fill="none" />
                    </svg>
                    Изменить
                  </button>
                  <button
                    className="cd-contract-action-btn cd-contract-action-delete"
                    onClick={() => handleContractDelete(contract._id)}
                  >
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 4h10M6 4V3h4v1M5 4v8.5a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                    </svg>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ромбовый разделитель */}
      <div className="cd-separator">
        <div className="cd-separator-line" />
        <div className="cd-separator-diamond" />
        <div className="cd-separator-line" />
      </div>

      {/* Заметки и история */}
      <div className="cd-section">
        <div className="cd-section-header">
          <h2>Заметки и история</h2>
        </div>
        <div className="cd-notes-input">
          <input
            type="text"
            placeholder="Добавить заметку — звонок, встреча, договорённость..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && noteText.trim() && !noteAdding) {
                handleAddNote();
              }
            }}
          />
          <button
            className="cd-notes-add-btn"
            onClick={handleAddNote}
            disabled={noteAdding || !noteText.trim()}
          >
            {noteAdding ? '...' : 'Добавить'}
          </button>
        </div>
        {notes.length === 0 ? (
          <p className="cd-notes-empty">Нет заметок</p>
        ) : (
          <div className="cd-notes-list">
            {notes.map(note => (
              <div key={note._id} className="cd-note-item">
                <div className="cd-note-diamond" />
                <div className="cd-note-content">
                  <div className="cd-note-text">{note.text}</div>
                  <div className="cd-note-date">{formatDate(note.date)}</div>
                </div>
                <button className="cd-note-delete" onClick={() => handleDeleteNote(note._id)}>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 4h10M6 4V3h4v1M5 4v8.5a1 1 0 001 1h4a1 1 0 001-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ромбовый разделитель */}
      <div className="cd-separator">
        <div className="cd-separator-line" />
        <div className="cd-separator-diamond" />
        <div className="cd-separator-line" />
      </div>

      {/* Задачи */}
      <div className="cd-section">
        <div className="cd-section-header">
          <h2>Задачи ({activeTasksCount})</h2>
          <button
            className="cd-section-add-btn"
            onClick={() => { setEditingTask(null); setShowTaskForm(true); }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Задача
          </button>
        </div>

        {clientTasks.length === 0 ? (
          <div className="cd-section-empty">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="8" width="20" height="24" rx="3" stroke="var(--sec)" strokeWidth="1.5" fill="none" opacity="0.4" />
              <path d="M16 16l3 3 5-5" stroke="var(--sec)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
              <path d="M16 26h8" stroke="var(--sec)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            </svg>
            <p>Нет задач для этого клиента</p>
            <button
              className="cd-section-empty-btn"
              onClick={() => { setEditingTask(null); setShowTaskForm(true); }}
            >
              Добавить задачу
            </button>
          </div>
        ) : (
          <div className="cd-tasks-list">
            {clientTasks.map(task => {
              const pri = PRIORITY_MAP[task.priority] || PRIORITY_MAP.m;
              const overdue = !task.done && isTaskOverdue(task.dueDate);

              return (
                <div key={task._id} className={`cd-task-item ${task.done ? 'cd-task-item-done' : ''}`}>
                  <button
                    className={`cd-task-checkbox ${task.done ? 'cd-task-checkbox-checked' : ''}`}
                    onClick={() => handleTaskToggle(task._id)}
                    title={task.done ? 'Вернуть' : 'Завершить'}
                  >
                    {task.done && (
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>

                  <div className="cd-task-content">
                    <div className="cd-task-title-row">
                      <span className={`cd-task-title ${task.done ? 'cd-task-title-done' : ''}`}>
                        {task.title}
                      </span>
                      <span className={`cd-task-priority ${pri.className}`}>
                        {pri.label}
                      </span>
                    </div>
                    {task.dueDate && (
                      <span className={`cd-task-date ${overdue ? 'cd-task-date-overdue' : ''}`}>
                        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        {formatDate(task.dueDate)}
                        {overdue && ' (просрочено)'}
                      </span>
                    )}
                  </div>

                  <div className="cd-task-actions">
                    <button className="cd-task-action-btn" onClick={() => handleTaskEdit(task)} title="Редактировать">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" stroke="currentColor" strokeWidth="1.2" fill="none" />
                      </svg>
                    </button>
                    <button className="cd-task-action-btn cd-task-action-delete" onClick={() => handleTaskDelete(task._id)} title="Удалить">
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Модаль редактирования клиента */}
      {showEditForm && (
        <ClientForm
          client={client}
          onSubmit={handleEditSubmit}
          onClose={() => setShowEditForm(false)}
        />
      )}

      {/* Модаль формы договора */}
      {showContractForm && (
        <ContractForm
          contract={editingContract}
          clientId={id}
          onSubmit={handleContractSubmit}
          onClose={() => { setShowContractForm(false); setEditingContract(null); }}
        />
      )}

      {/* Модаль формы задачи */}
      {showTaskForm && (
        <TaskForm
          task={editingTask}
          fixedClient={client}
          onSubmit={handleTaskSubmit}
          onClose={() => { setShowTaskForm(false); setEditingTask(null); }}
        />
      )}

      {/* Модаль ссылки на документы */}
      {showLinkForm && (
        <div className="client-form-overlay" onClick={() => setShowLinkForm(false)}>
          <div className="client-form-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="client-form-header">
              <h2>Ссылка на документы</h2>
              <button className="client-form-close" onClick={() => setShowLinkForm(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="client-form-field">
              <label htmlFor="link-input">Ссылка (Google Drive, Dropbox и т.д.)</label>
              <input
                id="link-input"
                type="url"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder="https://drive.google.com/..."
                autoFocus
              />
            </div>
            <div className="client-form-actions" style={{ marginTop: 16 }}>
              <button className="client-form-cancel" onClick={() => setShowLinkForm(false)}>
                Отмена
              </button>
              <button className="client-form-submit" onClick={handleLinkSave} disabled={linkSaving}>
                {linkSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientDetail;
