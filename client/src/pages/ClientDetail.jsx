import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import ClientForm from '../components/ClientForm';
import './ClientDetail.css';

const STATUS_LABELS = {
  active: 'Активный',
  potential: 'Потенциальный',
  inactive: 'Неактивный'
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

  // Заметки
  const [notes, setNotes] = useState([]);
  const [noteText, setNoteText] = useState('');
  const [noteAdding, setNoteAdding] = useState(false);

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

  const fetchNotes = useCallback(async () => {
    try {
      const res = await api.get(`/clients/${id}/notes`);
      setNotes(res.data.data);
    } catch {
      // Молча — заметки не критичны
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
    fetchNotes();
  }, [fetchClient, fetchNotes]);

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
          <h2>Договоры ({summary ? summary.contractCount : 0})</h2>
          <button className="cd-section-add-btn" onClick={() => alert('Форма договора будет доступна в фазе 3')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Договор
          </button>
        </div>
        <div className="cd-section-empty">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="6" width="24" height="28" rx="2" stroke="var(--sec)" strokeWidth="1.5" fill="none" opacity="0.4" />
            <path d="M14 14h12M14 19h12M14 24h8" stroke="var(--sec)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          </svg>
          <p>У клиента нет договоров</p>
          <button className="cd-section-empty-btn" onClick={() => alert('Форма договора будет доступна в фазе 3')}>
            Добавить договор
          </button>
        </div>
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
          <h2>Задачи (0)</h2>
          <button className="cd-section-add-btn cd-section-add-btn-ghost" onClick={() => alert('Форма задачи будет доступна в фазе 4')}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Задача
          </button>
        </div>
        <p className="cd-notes-empty">Нет задач</p>
      </div>

      {/* Модаль редактирования клиента */}
      {showEditForm && (
        <ClientForm
          client={client}
          onSubmit={handleEditSubmit}
          onClose={() => setShowEditForm(false)}
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
