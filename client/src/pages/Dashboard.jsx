import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { BurgerButton } from '../components/Layout';
import './Dashboard.css';

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Всё время' },
  { value: 'month', label: 'Месяц' },
  { value: 'quarter', label: 'Квартал' },
  { value: 'year', label: 'Год' }
];

function formatMoney(val) {
  if (val == null) return '0';
  return Math.round(val).toLocaleString('ru-RU');
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

const PRIORITY_LABELS = { h: 'Высокий', m: 'Средний', l: 'Низкий' };

/* === SVG-иконки === */

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7.5" cy="7.5" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.5 11.5L15.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconChevron({ open }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 2L1.5 15.5h15L9 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9 7v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="9" cy="12.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function IconPremium() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCommission() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v10M9 9.5c0-.828 1.343-1.5 3-1.5s3 .672 3 1.5S14.657 11 12 11 9 11.672 9 12.5 10.343 14 12 14s3 .672 3 1.5-1.343 1.5-3 1.5-3-.672-3-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconClients() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconDebt() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 6.5h12" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconCake() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="7" width="12" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 10h12" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 7V5.5a1 1 0 012 0V7M9 7V5.5a1 1 0 012 0V7" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="3.5" r="0.75" fill="currentColor" />
      <circle cx="10" cy="3.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

function IconRhombus() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="0.5" width="5" height="5" rx="0.5" transform="rotate(45 4 0.5)" fill="currentColor" />
    </svg>
  );
}

/* === Компонент Dashboard === */

function Dashboard() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState('all');
  const [searchInput, setSearchInput] = useState('');

  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [byCompany, setByCompany] = useState([]);
  const [byType, setByType] = useState([]);
  const [upcoming, setUpcoming] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Секции сворачивания
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  // Детали тревог
  const [overdueOpen, setOverdueOpen] = useState(false);
  const [expiringOpen, setExpiringOpen] = useState(false);
  const [upcomingInstOpen, setUpcomingInstOpen] = useState(false);
  const [todayTasksOpen, setTodayTasksOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, alertsRes, companyRes, typeRes, upcomingRes] = await Promise.all([
        api.get('/dashboard/stats', { params: { period } }),
        api.get('/dashboard/alerts'),
        api.get('/dashboard/by-company'),
        api.get('/dashboard/by-type'),
        api.get('/dashboard/upcoming')
      ]);
      setStats(statsRes.data.data);
      setAlerts(alertsRes.data.data);
      setByCompany(companyRes.data.data);
      setByType(typeRes.data.data);
      setUpcoming(upcomingRes.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка загрузки дашборда');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/clients?search=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const goToClient = (clientId) => {
    if (clientId) navigate(`/clients/${clientId}`);
  };

  const alertCount = alerts
    ? (alerts.overdueInstallments?.length || 0) +
      (alerts.expiringContracts?.length || 0) +
      (alerts.upcomingInstallments?.length || 0) +
      (alerts.todayTasks?.length || 0)
    : 0;

  if (loading) {
    return (
      <div className="dash-page">
        <div className="dash-loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="dash-page">
      {/* === Заголовок === */}
      <div className="dash-header">
        <BurgerButton />
        <h1>Дашборд</h1>
        <div className="dash-header-controls">
          <form className="dash-search" onSubmit={handleSearch}>
            <IconSearch />
            <input
              type="text"
              placeholder="Быстрый поиск клиента..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
          <select
            className="dash-period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            {PERIOD_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <div className="dash-error">{error}</div>}

      {/* === Тревоги === */}
      {alertCount > 0 && (
        <div className="dash-alerts">
          <button className="dash-section-toggle" onClick={() => setAlertsOpen(!alertsOpen)}>
            <div className="dash-section-toggle-left">
              <IconWarning />
              <span className="dash-section-title">Требует внимания</span>
              <span className="dash-alert-badge">{alertCount}</span>
            </div>
            <IconChevron open={alertsOpen} />
          </button>

          {alertsOpen && (
            <div className="dash-alerts-body">
              {/* Просроченные взносы */}
              {alerts.overdueInstallments?.length > 0 && (
                <div className="dash-alert-card dash-alert-danger">
                  <button className="dash-alert-card-header" onClick={() => setOverdueOpen(!overdueOpen)}>
                    <div className="dash-alert-card-info">
                      <span className="dash-alert-card-label">Просроченные взносы</span>
                      <span className="dash-alert-card-count">{alerts.overdueInstallments.length}</span>
                      <span className="dash-alert-card-sum">{formatMoney(alerts.overdueTotal)} ₽</span>
                    </div>
                    <IconChevron open={overdueOpen} />
                  </button>
                  {overdueOpen && (
                    <div className="dash-alert-card-details">
                      {alerts.overdueInstallments.map((item, i) => (
                        <div key={i} className="dash-alert-detail-row" onClick={() => goToClient(item.clientId)}>
                          <span className="dash-alert-detail-name">{item.clientName}</span>
                          <span className="dash-alert-detail-info">{item.company} {item.contractNumber ? `№${item.contractNumber}` : ''}</span>
                          <span className="dash-alert-detail-amount">{formatMoney(item.amount)} ₽</span>
                          <span className="dash-alert-detail-days">−{item.daysOverdue} дн.</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Взносы на неделе */}
              {alerts.upcomingInstallments?.length > 0 && (
                <div className="dash-alert-card dash-alert-warning">
                  <button className="dash-alert-card-header" onClick={() => setUpcomingInstOpen(!upcomingInstOpen)}>
                    <div className="dash-alert-card-info">
                      <span className="dash-alert-card-label">Взносы на неделе</span>
                      <span className="dash-alert-card-count">{alerts.upcomingInstallments.length}</span>
                    </div>
                    <IconChevron open={upcomingInstOpen} />
                  </button>
                  {upcomingInstOpen && (
                    <div className="dash-alert-card-details">
                      {alerts.upcomingInstallments.map((item, i) => (
                        <div key={i} className="dash-alert-detail-row" onClick={() => goToClient(item.clientId)}>
                          <span className="dash-alert-detail-name">{item.clientName}</span>
                          <span className="dash-alert-detail-info">{item.company} {item.contractNumber ? `№${item.contractNumber}` : ''}</span>
                          <span className="dash-alert-detail-amount">{formatMoney(item.amount)} ₽</span>
                          <span className="dash-alert-detail-days">через {item.daysUntil} дн.</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Истекающие договоры */}
              {alerts.expiringContracts?.length > 0 && (
                <div className="dash-alert-card dash-alert-warning">
                  <button className="dash-alert-card-header" onClick={() => setExpiringOpen(!expiringOpen)}>
                    <div className="dash-alert-card-info">
                      <span className="dash-alert-card-label">Истекающие договоры</span>
                      <span className="dash-alert-card-count">{alerts.expiringContracts.length}</span>
                    </div>
                    <IconChevron open={expiringOpen} />
                  </button>
                  {expiringOpen && (
                    <div className="dash-alert-card-details">
                      {alerts.expiringContracts.map((item, i) => (
                        <div key={i} className="dash-alert-detail-row" onClick={() => goToClient(item.clientId)}>
                          <span className="dash-alert-detail-name">{item.clientName}</span>
                          <span className="dash-alert-detail-info">{item.company} · {item.type} {item.contractNumber ? `№${item.contractNumber}` : ''}</span>
                          <span className="dash-alert-detail-days">через {item.daysUntil} дн.</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Задачи на сегодня */}
              {alerts.todayTasks?.length > 0 && (
                <div className="dash-alert-card dash-alert-info">
                  <button className="dash-alert-card-header" onClick={() => setTodayTasksOpen(!todayTasksOpen)}>
                    <div className="dash-alert-card-info">
                      <span className="dash-alert-card-label">Задачи на сегодня</span>
                      <span className="dash-alert-card-count">{alerts.todayTasks.length}</span>
                    </div>
                    <IconChevron open={todayTasksOpen} />
                  </button>
                  {todayTasksOpen && (
                    <div className="dash-alert-card-details">
                      {alerts.todayTasks.map((item, i) => (
                        <div key={i} className="dash-alert-detail-row" onClick={() => goToClient(item.clientId)}>
                          <span className="dash-alert-detail-name">{item.title}</span>
                          {item.clientName && <span className="dash-alert-detail-info">{item.clientName}</span>}
                          <span className={`dash-alert-detail-priority priority-${item.priority}`}>
                            {PRIORITY_LABELS[item.priority] || item.priority}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* === 4 метрики === */}
      {stats && (
        <div className="dash-metrics">
          <div className="dash-metric-card">
            <div className="dash-metric-icon dash-metric-icon-premium"><IconPremium /></div>
            <div className="dash-metric-data">
              <span className="dash-metric-value">{formatMoney(stats.totalPremium)} ₽</span>
              <span className="dash-metric-label">Сборы (премии)</span>
            </div>
          </div>
          <div className="dash-metric-card">
            <div className="dash-metric-icon dash-metric-icon-commission"><IconCommission /></div>
            <div className="dash-metric-data">
              <span className="dash-metric-value">{formatMoney(stats.totalCommission)} ₽</span>
              <span className="dash-metric-label">Комиссия (КВ)</span>
            </div>
          </div>
          <div className="dash-metric-card">
            <div className="dash-metric-icon dash-metric-icon-clients"><IconClients /></div>
            <div className="dash-metric-data">
              <span className="dash-metric-value">{stats.clientCount}</span>
              <span className="dash-metric-label">Клиенты</span>
            </div>
          </div>
          <div className="dash-metric-card">
            <div className="dash-metric-icon dash-metric-icon-debt"><IconDebt /></div>
            <div className="dash-metric-data">
              <span className="dash-metric-value">{formatMoney(stats.totalDebt)} ₽</span>
              <span className="dash-metric-label">Задолженность</span>
            </div>
          </div>
        </div>
      )}

      {/* === Аналитика (свёрнута) === */}
      <div className="dash-analytics">
        <button className="dash-section-toggle" onClick={() => setAnalyticsOpen(!analyticsOpen)}>
          <div className="dash-section-toggle-left">
            <span className="dash-section-title">Аналитика</span>
          </div>
          <IconChevron open={analyticsOpen} />
        </button>

        {analyticsOpen && (
          <div className="dash-analytics-body">
            {/* По СК */}
            {byCompany.length > 0 && (
              <div className="dash-analytics-block">
                <h3 className="dash-analytics-subtitle">По страховым компаниям</h3>
                <div className="dash-analytics-table">
                  <div className="dash-analytics-thead">
                    <span>СК</span>
                    <span>Договоров</span>
                    <span>Премия</span>
                    <span>КВ</span>
                  </div>
                  {byCompany.map((row, i) => (
                    <div key={i} className="dash-analytics-row">
                      <span className="dash-analytics-cell-name">{row.company}</span>
                      <span>{row.count}</span>
                      <span>{formatMoney(row.totalPremium)} ₽</span>
                      <span>{formatMoney(row.totalCommission)} ₽</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* По типам */}
            {byType.length > 0 && (
              <div className="dash-analytics-block">
                <h3 className="dash-analytics-subtitle">По типам страхования</h3>
                <div className="dash-analytics-table">
                  <div className="dash-analytics-thead">
                    <span>Тип</span>
                    <span>Договоров</span>
                    <span>Премия</span>
                    <span>КВ</span>
                  </div>
                  {byType.map((row, i) => (
                    <div key={i} className="dash-analytics-row">
                      <span className="dash-analytics-cell-name">{row.type}</span>
                      <span>{row.count}</span>
                      <span>{formatMoney(row.totalPremium)} ₽</span>
                      <span>{formatMoney(row.totalCommission)} ₽</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {byCompany.length === 0 && byType.length === 0 && (
              <p className="dash-analytics-empty">Нет данных для аналитики. Добавьте договоры.</p>
            )}
          </div>
        )}
      </div>

      {/* === Задачи и ДР === */}
      <div className="dash-upcoming">
        <div className="dash-upcoming-columns">
          {/* Задачи на месяц */}
          <div className="dash-upcoming-block">
            <h3 className="dash-upcoming-title">
              <IconCalendar />
              Задачи на месяц
              {upcoming?.tasks?.length > 0 && (
                <span className="dash-upcoming-count">{upcoming.tasks.length}</span>
              )}
            </h3>
            {upcoming?.tasks?.length > 0 ? (
              <div className="dash-upcoming-list">
                {upcoming.tasks.map((task, i) => (
                  <div key={i} className="dash-upcoming-item" onClick={() => goToClient(task.clientId)}>
                    <div className="dash-upcoming-item-left">
                      <IconRhombus />
                      <div className="dash-upcoming-item-text">
                        <span className="dash-upcoming-item-title">{task.title}</span>
                        {task.clientName && (
                          <span className="dash-upcoming-item-sub">{task.clientName}</span>
                        )}
                      </div>
                    </div>
                    <div className="dash-upcoming-item-right">
                      <span className={`dash-upcoming-priority priority-${task.priority}`}>
                        {PRIORITY_LABELS[task.priority] || task.priority}
                      </span>
                      <span className="dash-upcoming-item-date">{formatDateShort(task.dueDate)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dash-upcoming-empty">Нет задач на ближайший месяц</p>
            )}
          </div>

          {/* Дни рождения */}
          <div className="dash-upcoming-block">
            <h3 className="dash-upcoming-title">
              <IconCake />
              Дни рождения
              {upcoming?.birthdays?.length > 0 && (
                <span className="dash-upcoming-count">{upcoming.birthdays.length}</span>
              )}
            </h3>
            {upcoming?.birthdays?.length > 0 ? (
              <div className="dash-upcoming-list">
                {upcoming.birthdays.map((bd, i) => (
                  <div key={i} className="dash-upcoming-item" onClick={() => goToClient(bd.clientId)}>
                    <div className="dash-upcoming-item-left">
                      <IconRhombus />
                      <div className="dash-upcoming-item-text">
                        <span className="dash-upcoming-item-title">{bd.clientName}</span>
                        <span className="dash-upcoming-item-sub">{formatDate(bd.birthday)}</span>
                      </div>
                    </div>
                    <div className="dash-upcoming-item-right">
                      <span className="dash-upcoming-item-days">
                        {bd.daysUntil === 0 ? 'Сегодня!' : `через ${bd.daysUntil} дн.`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="dash-upcoming-empty">Нет дней рождения в ближайший месяц</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
