import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import ContractForm from '../components/ContractForm';
import './Contracts.css';

const STATUS_LABELS = {
  active: 'Действующий',
  expiring_7: 'Истекает',
  expiring_14: 'Истекает',
  expiring_30: 'Истекает',
  expired: 'Истёк'
};

const STATUS_CLASS = {
  active: 'ct-status-active',
  expiring_7: 'ct-status-danger',
  expiring_14: 'ct-status-warning',
  expiring_30: 'ct-status-warning',
  expired: 'ct-status-danger'
};

const COLUMNS = [
  { key: 'clientName', label: 'Клиент', sortable: false },
  { key: 'company', label: 'СК', sortable: true },
  { key: 'type', label: 'Тип', sortable: true },
  { key: 'number', label: '№', sortable: true },
  { key: 'objectType', label: 'Объект', sortable: true },
  { key: 'endDate', label: 'Даты', sortable: true },
  { key: 'status', label: 'Статус', sortable: false },
  { key: 'premium', label: 'Премия', sortable: true },
  { key: 'commissionAmount', label: 'КВ ожид.', sortable: false },
  { key: 'installments', label: 'Взносы', sortable: false },
];

const OBJECT_LABELS = {
  auto: 'Авто',
  realty: 'Недвиж.',
  life: 'Жизнь'
};

function Contracts() {
  const navigate = useNavigate();

  const [contracts, setContracts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterObjectType, setFilterObjectType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sort, setSort] = useState('-createdAt');
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);

  // Уникальные значения для фильтров
  const [companies, setCompanies] = useState([]);
  const [types, setTypes] = useState([]);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 50, sort };
      if (search.trim()) params.search = search.trim();
      if (filterCompany) params.company = filterCompany;
      if (filterType) params.type = filterType;
      if (filterObjectType) params.objectType = filterObjectType;
      if (filterStatus) params.status = filterStatus;

      const [listRes, totalsRes] = await Promise.all([
        api.get('/contracts', { params }),
        api.get('/contracts/totals', { params: {
          company: filterCompany || undefined,
          type: filterType || undefined,
          objectType: filterObjectType || undefined,
          status: filterStatus || undefined
        }})
      ]);

      setContracts(listRes.data.data);
      setPagination(listRes.data.pagination);
      setTotals(totalsRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [search, filterCompany, filterType, filterObjectType, filterStatus, sort, page]);

  // Загрузка уникальных значений для фильтров
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const res = await api.get('/contracts', { params: { limit: 200 } });
        const all = res.data.data || [];
        setCompanies([...new Set(all.map(c => c.company).filter(Boolean))].sort());
        setTypes([...new Set(all.map(c => c.type).filter(Boolean))].sort());
      } catch {
        // Не критично
      }
    };
    loadFilterOptions();
  }, []);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Дебаунс поиска
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (key) => {
    if (sort === key) {
      setSort(`-${key}`);
    } else if (sort === `-${key}`) {
      setSort('-createdAt');
    } else {
      setSort(key);
    }
    setPage(1);
  };

  const getSortArrow = (key) => {
    if (sort === key) return '▲';
    if (sort === `-${key}`) return '▼';
    return '▴';
  };

  const handleContractSubmit = async (payload) => {
    await api.post('/contracts', payload);
    setShowForm(false);
    fetchContracts();
  };

  // --- Форматирование ---

  const formatDate = (date) => {
    if (!date) return '—';
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

  const getStatusLabel = (contract) => {
    const label = STATUS_LABELS[contract.status] || contract.status;
    if (contract.status && contract.status.startsWith('expiring') && contract.endDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const end = new Date(contract.endDate);
      end.setHours(0, 0, 0, 0);
      const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      return `${label} (${days}д)`;
    }
    return label;
  };

  const getClientId = (contract) => {
    return typeof contract.clientId === 'object' ? contract.clientId._id : contract.clientId;
  };

  const getClientName = (contract) => {
    return typeof contract.clientId === 'object' ? contract.clientId.name : '—';
  };

  const getInstallmentsSummary = (installments) => {
    if (!installments || installments.length === 0) return '—';
    const paid = installments.filter(i => i.paid).length;
    return `${paid}/${installments.length}`;
  };

  return (
    <div className="contracts-page">
      <div className="contracts-header">
        <h1>Договоры</h1>
        <button className="contracts-add-btn" onClick={() => setShowForm(true)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Новый договор
        </button>
      </div>

      {/* Тулбар */}
      <div className="contracts-toolbar">
        <div className="contracts-search">
          <svg className="contracts-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Поиск по клиенту, СК, номеру, типу..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <div className="contracts-filters">
          <select value={filterCompany} onChange={(e) => { setFilterCompany(e.target.value); setPage(1); }}>
            <option value="">Все СК</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}>
            <option value="">Все типы</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filterObjectType} onChange={(e) => { setFilterObjectType(e.target.value); setPage(1); }}>
            <option value="">Все объекты</option>
            <option value="auto">Авто</option>
            <option value="realty">Недвижимость</option>
            <option value="life">Жизнь</option>
          </select>
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
            <option value="">Все статусы</option>
            <option value="active">Действующие</option>
            <option value="expiring_30">Истекающие</option>
            <option value="expired">Истёкшие</option>
          </select>
        </div>
      </div>

      {error && <div className="contracts-error">{error}</div>}

      {loading ? (
        <div className="contracts-loading">Загрузка...</div>
      ) : contracts.length === 0 ? (
        <div className="contracts-empty">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="10" y="7" width="28" height="34" rx="3" stroke="var(--sec)" strokeWidth="1.5" fill="none" opacity="0.4" />
            <path d="M17 17h14M17 23h14M17 29h10" stroke="var(--sec)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          </svg>
          <h3>Нет договоров</h3>
          <p>Добавьте первый договор через карточку клиента или кнопку выше</p>
          <button className="contracts-empty-btn" onClick={() => setShowForm(true)}>Добавить договор</button>
        </div>
      ) : (
        <>
          <div className="contracts-count">
            Найдено: {pagination.total}
          </div>

          <div className="contracts-table-wrap">
            <table className="contracts-table">
              <thead>
                <tr>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className={sort === col.key || sort === `-${col.key}` ? 'sorted' : ''}
                      onClick={() => col.sortable && handleSort(col.key)}
                      style={!col.sortable ? { cursor: 'default' } : {}}
                    >
                      {col.label}
                      {col.sortable && (
                        <span className="sort-arrow">{getSortArrow(col.key)}</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map(contract => (
                  <tr
                    key={contract._id}
                    onClick={() => navigate(`/clients/${getClientId(contract)}`)}
                  >
                    <td className="ct-client">{getClientName(contract)}</td>
                    <td className="ct-company">{contract.company}</td>
                    <td><span className="ct-type">{contract.type}</span></td>
                    <td className="ct-number">{contract.number || '—'}</td>
                    <td>{OBJECT_LABELS[contract.objectType] || '—'}</td>
                    <td>
                      {formatDate(contract.startDate)} — {formatDate(contract.endDate)}
                    </td>
                    <td>
                      <span className={`ct-status ${STATUS_CLASS[contract.status] || ''}`}>
                        {getStatusLabel(contract)}
                      </span>
                    </td>
                    <td className="ct-premium">{formatCurrency(contract.premium)} ₽</td>
                    <td className="ct-commission">{formatCurrency(contract.commissionAmount)} ₽</td>
                    <td className="ct-installments">{getInstallmentsSummary(contract.installments)}</td>
                  </tr>
                ))}
              </tbody>
              {totals && (
                <tfoot>
                  <tr>
                    <td className="ct-total-label">Итого ({totals.count})</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="ct-premium">{formatCurrency(totals.totalPremium)} ₽</td>
                    <td className="ct-commission">{formatCurrency(totals.totalCommission)} ₽</td>
                    <td className="ct-installments">{totals.totalPaidInstallments}/{totals.totalInstallments}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Пагинация */}
          {pagination.pages > 1 && (
            <div className="contracts-pagination">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage(prev => prev - 1)}
              >
                Назад
              </button>
              <span>Стр. {pagination.page} из {pagination.pages}</span>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPage(prev => prev + 1)}
              >
                Далее
              </button>
            </div>
          )}
        </>
      )}

      {/* Модаль нового договора */}
      {showForm && (
        <ContractForm
          onSubmit={handleContractSubmit}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

export default Contracts;
