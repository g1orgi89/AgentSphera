import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../store/ToastContext';
import ClientCard from '../components/ClientCard';
import ClientForm from '../components/ClientForm';
import { BurgerButton } from '../components/Layout';
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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [merging, setMerging] = useState(false);

  const fetchClients = useCallback(async (page = 1) => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: 20, sort };
      if (search.trim()) params.search = search.trim();
      if (status) params.status = status;
      const res = await api.get('/clients', { params });
      setClients(res.data.data); setPagination(res.data.pagination);
    } catch (err) { setError(err.response?.data?.error || 'Ошибка загрузки клиентов'); } finally { setLoading(false); }
  }, [search, status, sort]);

  const fetchDuplicates = useCallback(async () => {
    try { const res = await api.get('/clients/duplicates'); setDuplicates(res.data.data || []); } catch {}
  }, []);

  useEffect(() => { fetchClients(1); }, [fetchClients]);
  useEffect(() => { fetchDuplicates(); }, [fetchDuplicates]);

  const [searchInput, setSearchInput] = useState('');
  useEffect(() => { const timer = setTimeout(() => { setSearch(searchInput); }, 400); return () => clearTimeout(timer); }, [searchInput]);

  const handleCreate = () => { setEditingClient(null); setShowForm(true); };
  const handleEdit = (client) => { setEditingClient(client); setShowForm(true); };

  const handleDelete = async (clientId) => {
    if (!window.confirm('Удалить клиента? Все его договоры, задачи и заметки будут удалены.')) return;
    try { await api.delete(`/clients/${clientId}`); toast.success('Клиент удалён'); fetchClients(pagination.page); fetchDuplicates(); } catch (err) { toast.error(err.response?.data?.error || 'Ошибка удаления'); }
  };

  const handleFormSubmit = async (data) => {
    if (editingClient) { await api.put(`/clients/${editingClient._id}`, data); toast.success('Клиент обновлён'); }
    else { const res = await api.post('/clients', data); if (res.data.warning) toast.warning(res.data.warning); else toast.success('Клиент добавлен'); }
    setShowForm(false); setEditingClient(null); fetchClients(pagination.page); fetchDuplicates();
  };

  const handleCardClick = (clientId) => { navigate(`/clients/${clientId}`); };

  const handleExport = async () => {
    setExporting(true);
    try { const res = await api.get('/export/xlsx', { responseType: 'blob' }); const url = window.URL.createObjectURL(res.data); const a = document.createElement('a'); a.href = url; a.download = 'contracts.xlsx'; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); toast.success('Экспорт завершён'); } catch { toast.error('Ошибка экспорта'); } finally { setExporting(false); }
  };

  const handleMerge = async (keepId, removeId) => {
    setMerging(true);
    try {
      await api.post('/clients/merge', { keepId, removeId });
      toast.success('Клиенты объединены');
      // Обновляем локально: убираем удалённого из группы
      setDuplicates(prev => {
        return prev.map(group => ({
          ...group,
          clients: group.clients.filter(c => String(c._id) !== String(removeId))
        })).filter(group => group.clients.length >= 2);
      });
      fetchClients(pagination.page);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Ошибка объединения');
    } finally { setMerging(false); }
  };

  const handleSkipDuplicate = (normalizedName) => {
    setDuplicates(prev => prev.filter(d => d.normalizedName !== normalizedName));
  };

  return (
    <div className="clients-page">
      <div className="clients-header">
        <BurgerButton /><h1>Клиенты</h1>
        <div className="clients-header-actions">
          <button className="clients-export-btn" onClick={handleExport} disabled={exporting} title="Экспорт договоров в Excel">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 12.5v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 3v8.5M5.5 8L9 11.5 12.5 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {exporting ? 'Экспорт...' : 'Excel'}
          </button>
          <button className="clients-add-btn" onClick={handleCreate}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            Добавить клиента
          </button>
        </div>
      </div>

      {duplicates.length > 0 && (
        <div className="clients-duplicates-banner">
          <div className="clients-duplicates-banner-text">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" /><path d="M9 5.5v4M9 12v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Найдено {duplicates.length} групп(ы) возможных дубликатов клиентов
          </div>
          <button className="clients-duplicates-btn" onClick={() => setShowDuplicates(true)}>Просмотреть</button>
        </div>
      )}

      <div className="clients-toolbar">
        <div className="clients-search">
          <svg className="clients-search-icon" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.5" /><path d="M11.5 11.5L15.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <input type="text" placeholder="Поиск по имени, телефону, email..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </div>
        <div className="clients-filters">
          <select value={status} onChange={(e) => setStatus(e.target.value)}>{STATUS_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>{SORT_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}</select>
        </div>
      </div>

      {error && <div className="clients-error">{error}</div>}

      {loading ? (<div className="clients-loading">Загрузка...</div>) : clients.length === 0 ? (
        <div className="clients-empty">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="20" width="24" height="24" rx="2" transform="rotate(45 28 32)" fill="var(--sec)" opacity="0.2" /><circle cx="32" cy="28" r="8" stroke="var(--sec)" strokeWidth="2" fill="none" /><path d="M20 48c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="var(--sec)" strokeWidth="2" fill="none" /></svg>
          <h3>Пока нет клиентов</h3><p>Добавьте первого клиента</p>
          <button className="clients-empty-btn" onClick={handleCreate}>Добавить клиента</button>
        </div>
      ) : (
        <>
          <div className="clients-count">Найдено: {pagination.total}</div>
          <div className="clients-list">{clients.map(client => (<ClientCard key={client._id} client={client} onClick={() => handleCardClick(client._id)} onEdit={() => handleEdit(client)} onDelete={() => handleDelete(client._id)} />))}</div>
          {pagination.pages > 1 && (<div className="clients-pagination"><button disabled={pagination.page <= 1} onClick={() => fetchClients(pagination.page - 1)}>Назад</button><span>{pagination.page} из {pagination.pages}</span><button disabled={pagination.page >= pagination.pages} onClick={() => fetchClients(pagination.page + 1)}>Вперёд</button></div>)}
        </>
      )}

      {showForm && <ClientForm client={editingClient} onSubmit={handleFormSubmit} onClose={() => { setShowForm(false); setEditingClient(null); }} />}

      {showDuplicates && (
        <div className="duplicates-overlay">
          <div className="duplicates-modal">
            <div className="duplicates-header">
              <h2>Возможные дубликаты</h2>
              <button className="duplicates-close" onClick={() => setShowDuplicates(false)}><svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></button>
            </div>
            {duplicates.length === 0 ? (<div className="duplicates-empty">Дубликатов не найдено</div>) : (
              <div className="duplicates-list">
                {duplicates.map((group, gIdx) => (
                  <div key={group.normalizedName + gIdx} className="duplicates-group">
                    <div className="duplicates-group-header">Группа: {group.clients.length} записей</div>
                    <div className="duplicates-group-clients">
                      {group.clients.map((client, cIdx) => (
                        <div key={client._id} className="duplicates-client">
                          <div className="duplicates-client-info">
                            <span className="duplicates-client-name">{client.name}</span>
                            <span className="duplicates-client-meta">
                              {client.phone && `Тел: ${client.phone}`}
                              {client.email && ` | ${client.email}`}
                              {` | Договоров: ${client.contractCount || 0}`}
                            </span>
                          </div>
                          {cIdx > 0 && (
                            <div className="duplicates-client-actions">
                              <button className="duplicates-merge-btn" onClick={() => handleMerge(group.clients[0]._id, client._id)} disabled={merging} title={`Объединить с "${group.clients[0].name}"`}>{merging ? '...' : 'Объединить'}</button>
                            </div>
                          )}
                          {cIdx === 0 && <div className="duplicates-client-badge">Основной</div>}
                        </div>
                      ))}
                    </div>
                    <button className="duplicates-skip-btn" onClick={() => handleSkipDuplicate(group.normalizedName)}>Пропустить</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Clients;
