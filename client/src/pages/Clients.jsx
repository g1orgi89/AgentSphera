import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../store/ToastContext';
import ClientCard from '../components/ClientCard';
import ClientForm from '../components/ClientForm';
import './Clients.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'active', label: 'Активные' },
  { value: 'potential', label: 'Потенциальные' },
  { value: 'inactive', label: 'Неактивные' }
];

const SORT_OPTIONS = [
  { value: '-createdAt', label: 'Новые первые' },
  { value: 'createdAt', label: 'Старые первые' },
  { value: 'name', label: 'Имя А-Я' },
  { value: '-name', label: 'Имя Я-А' }
];

function Clients() {
  const navigate = useNavigate();
  const toast = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Фильтры
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-createdAt');

  // Пагинация
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  // Модальная форма
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);

  // Экспорт
  const [exporting, setExporting] = useState(false);

  const fetchClients = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 20, sort };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;

      const res = await api.get('/clients', { params });
      setClients(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки клиентов');
    } finally {
      setLoading(false);
    }
  }, [search, status, sort]);

  useEffect(() => {
    fetchClients(1);
  }, [fetchClients]);

  // Дебаунс поиска
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCreate = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Удалить клиента? Все его договоры, задачи и заметки будут удалены.')) {
      return;
    }
    try {
      await api.delete(`/clients/${clientId}`);
      toast.success('Клиент удалён');
      fetchClients(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка удаления');
    }
  };

  const handleFormSubmit = async (data) => {
    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient._id}`, data);
        toast.success('Клиент обновлён');
      } else {
        const res = await api.post('/clients', data);
        if (res.data.warning) {
          toast.warning(res.data.warning);
        } else {
          toast.success('Клиент добавлен');
        }
      }
      setShowForm(false);
      setEditingClient(null);
      fetchClients(pagination.page);
    } catch (err) {
      throw err;
    }
  };

  const handleCardClick = (clientId) => {
    navigate(`/clients/${clientId}`);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/export/xlsx', { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'contracts.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Экспорт завершён');
    } catch (err) {
      toast.error('Ошибка экспорта');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="clients-page">
      <div className="clients-header">
        <h1>Клиенты</h1>
        <div className="clients-header-actions">
          <button
            className="clients-export-btn"
            onClick={handleExport}
            disabled={exporting}
            title="Экспорт договоров в Excel"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12.5v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 3v8.5M5.5 8L9 11.5 12.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {exporting ? 'Экспорт...' : 'Excel'}
          </button>
          <button className="clients-add-btn" onClick={handleCreate}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Добавить клиента
          </button>
        </div>
      </div>

      <div className="clients-toolbar">
        <div className="clients-search">
          <svg className="clients-search-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11.5 11.5L15.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Поиск по имени, телефону, email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <div className="clients-filters">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="clients-error">{error}</div>}

      {loading ? (
        <div className="clients-loading">Загрузка...</div>
      ) : clients.length === 0 ? (
        <div className="clients-empty">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="16" y="20" width="24" height="24" rx="2" transform="rotate(45 28 32)" fill="var(--sec)" opacity="0.2" />
            <circle cx="32" cy="28" r="8" stroke="var(--sec)" strokeWidth="2" fill="none" />
            <path d="M20 48c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="var(--sec)" strokeWidth="2" fill="none" />
          </svg>
          <h3>Пока нет клиентов</h3>
          <p>Добавьте первого клиента, чтобы начать работу</p>
          <button className="clients-empty-btn" onClick={handleCreate}>
            Добавить клиента
          </button>
        </div>
      ) : (
        <>
          <div className="clients-count">
            Найдено: {pagination.total}
          </div>

          <div className="clients-list">
            {clients.map(client => (
              <ClientCard
                key={client._id}
                client={client}
                onClick={() => handleCardClick(client._id)}
                onEdit={() => handleEdit(client)}
                onDelete={() => handleDelete(client._id)}
              />
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="clients-pagination">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchClients(pagination.page - 1)}
              >
                Назад
              </button>
              <span>{pagination.page} из {pagination.pages}</span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchClients(pagination.page + 1)}
              >
                Вперёд
              </button>
            </div>
          )}
        </>
      )}

      {showForm && (
        <ClientForm
          client={editingClient}
          onSubmit={handleFormSubmit}
          onClose={() => { setShowForm(false); setEditingClient(null); }}
        />
      )}
    </div>
  );
}

export default Clients;
