import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { BurgerButton } from '../components/Layout';
import './Calendar.css';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const EVENT_TYPES = {
  task: { label: 'Задача', cls: 'cal-ev-task' },
  expiry: { label: 'Окончание', cls: 'cal-ev-expiry' },
  installment: { label: 'Взнос', cls: 'cal-ev-installment' },
  birthday: { label: 'ДР', cls: 'cal-ev-birthday' }
};

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function Calendar() {
  const navigate = useNavigate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ tasks: 0, expiries: 0, installments: 0, birthdays: 0 });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, contractsRes, clientsRes] = await Promise.all([
        api.get('/tasks', { params: { filter: 'all', limit: 200 } }),
        api.get('/contracts', { params: { limit: 200 } }),
        api.get('/clients', { params: { limit: 200, sort: 'name' } })
      ]);

      const tasks = tasksRes.data.data || [];
      const contracts = contractsRes.data.data || [];
      const clients = clientsRes.data.data || [];

      const evMap = {};
      let sTask = 0, sExpiry = 0, sInst = 0, sBday = 0;

      const addEvent = (key, ev) => {
        if (!evMap[key]) evMap[key] = [];
        evMap[key].push(ev);
      };

      const isInMonth = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        return d.getFullYear() === year && d.getMonth() === month;
      };

      // Задачи с dueDate
      tasks.forEach(t => {
        if (t.dueDate && isInMonth(t.dueDate)) {
          const key = toKey(new Date(t.dueDate));
          addEvent(key, {
            type: 'task',
            title: t.title,
            done: t.done,
            priority: t.priority,
            clientName: t.clientId?.name || null,
            clientId: t.clientId?._id || null
          });
          sTask++;
        }
      });

      // Окончания договоров
      contracts.forEach(c => {
        if (c.endDate && isInMonth(c.endDate)) {
          const key = toKey(new Date(c.endDate));
          const clientName = typeof c.clientId === 'object' ? c.clientId?.name : null;
          const clientIdVal = typeof c.clientId === 'object' ? c.clientId?._id : c.clientId;
          addEvent(key, {
            type: 'expiry',
            title: `${c.company} — ${c.type}`,
            number: c.number,
            clientName,
            clientId: clientIdVal
          });
          sExpiry++;
        }

        // Взносы
        if (c.installments) {
          c.installments.forEach(inst => {
            if (inst.dueDate && isInMonth(inst.dueDate)) {
              const key = toKey(new Date(inst.dueDate));
              const clientName = typeof c.clientId === 'object' ? c.clientId?.name : null;
              const clientIdVal = typeof c.clientId === 'object' ? c.clientId?._id : c.clientId;
              addEvent(key, {
                type: 'installment',
                title: `${c.company} — ${inst.amount?.toLocaleString('ru-RU')} \u20bd`,
                paid: inst.paid,
                clientName,
                clientId: clientIdVal
              });
              sInst++;
            }
          });
        }
      });

      // Дни рождения
      clients.forEach(cl => {
        if (cl.birthday) {
          const bday = new Date(cl.birthday);
          if (bday.getMonth() === month) {
            const dayInMonth = new Date(year, month, bday.getDate());
            const key = toKey(dayInMonth);
            addEvent(key, {
              type: 'birthday',
              title: cl.name,
              clientId: cl._id
            });
            sBday++;
          }
        }
      });

      setEvents(evMap);
      setSummary({ tasks: sTask, expiries: sExpiry, installments: sInst, birthdays: sBday });
    } catch {
      // Не блокируем
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Навигация
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(toKey(today));
  };

  // Сетка календаря
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Пн=0
  const daysInMonth = lastDay.getDate();

  const cells = [];
  // Пустые ячейки до 1-го числа
  for (let i = 0; i < startOffset; i++) {
    cells.push({ day: null, key: `empty-${i}` });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = toKey(date);
    cells.push({ day: d, key, isToday: key === toKey(today), events: events[key] || [] });
  }

  const selectedEvents = selectedDay ? (events[selectedDay] || []) : [];
  const selectedDate = selectedDay ? new Date(selectedDay + 'T00:00:00') : null;

  return (
    <div className="cal-page">
      <div className="cal-header">
        <BurgerButton />
        <h1>Календарь</h1>
      </div>

      {/* Сводка месяца */}
      <div className="cal-summary">
        <div className="cal-summary-item cal-ev-task">
          <span className="cal-summary-diamond" />
          <span>Задачи: {summary.tasks}</span>
        </div>
        <div className="cal-summary-item cal-ev-expiry">
          <span className="cal-summary-diamond" />
          <span>Окончания: {summary.expiries}</span>
        </div>
        <div className="cal-summary-item cal-ev-installment">
          <span className="cal-summary-diamond" />
          <span>Взносы: {summary.installments}</span>
        </div>
        <div className="cal-summary-item cal-ev-birthday">
          <span className="cal-summary-diamond" />
          <span>ДР: {summary.birthdays}</span>
        </div>
      </div>

      {/* Навигация */}
      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="cal-nav-title">
          <span className="cal-nav-month">{MONTH_NAMES[month]}</span>
          <span className="cal-nav-year">{year}</span>
        </div>
        <button className="cal-nav-btn" onClick={nextMonth}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="cal-today-btn" onClick={goToday}>Сегодня</button>
      </div>

      {loading ? (
        <div className="cal-loading">Загрузка...</div>
      ) : (
        <>
          {/* Сетка */}
          <div className="cal-grid">
            {WEEKDAYS.map(wd => (
              <div key={wd} className="cal-weekday">{wd}</div>
            ))}
            {cells.map(cell => (
              <div
                key={cell.key}
                className={`cal-cell ${cell.day ? 'cal-cell-active' : ''} ${cell.isToday ? 'cal-cell-today' : ''} ${selectedDay === cell.key ? 'cal-cell-selected' : ''}`}
                onClick={() => cell.day && setSelectedDay(cell.key)}
              >
                {cell.day && (
                  <>
                    <span className="cal-day-num">{cell.day}</span>
                    {cell.events.length > 0 && (
                      <div className="cal-dots">
                        {/* Уникальные типы событий для ромбов */}
                        {[...new Set(cell.events.map(e => e.type))].map(type => (
                          <span key={type} className={`cal-diamond ${EVENT_TYPES[type]?.cls || ''}`} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Детали дня */}
          {selectedDay && (
            <div className="cal-details">
              <div className="cal-details-header">
                <h3>
                  {selectedDate && selectedDate.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    weekday: 'long'
                  })}
                </h3>
                <button className="cal-details-close" onClick={() => setSelectedDay(null)}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {selectedEvents.length === 0 ? (
                <p className="cal-details-empty">Нет событий</p>
              ) : (
                <div className="cal-details-list">
                  {selectedEvents.map((ev, idx) => {
                    const evType = EVENT_TYPES[ev.type] || EVENT_TYPES.task;
                    return (
                      <div key={idx} className="cal-detail-item">
                        <span className={`cal-detail-diamond ${evType.cls}`} />
                        <div className="cal-detail-content">
                          <div className="cal-detail-top">
                            <span className={`cal-detail-badge ${evType.cls}`}>{evType.label}</span>
                            <span className={`cal-detail-title ${ev.done ? 'cal-detail-done' : ''}`}>
                              {ev.title}
                            </span>
                          </div>
                          {ev.clientName && (
                            <span
                              className="cal-detail-client"
                              onClick={() => ev.clientId && navigate(`/clients/${ev.clientId}`)}
                            >
                              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                                <path d="M3 12c0-2.21 1.79-4 4-4s4 1.79 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                              </svg>
                              {ev.clientName}
                            </span>
                          )}
                          {ev.type === 'birthday' && ev.clientId && (
                            <span
                              className="cal-detail-client"
                              onClick={() => navigate(`/clients/${ev.clientId}`)}
                            >
                              Перейти к клиенту
                            </span>
                          )}
                          {ev.type === 'installment' && (
                            <span className={`cal-detail-extra ${ev.paid ? 'cal-detail-paid' : 'cal-detail-unpaid'}`}>
                              {ev.paid ? 'Оплачен' : 'Не оплачен'}
                            </span>
                          )}
                          {ev.type === 'task' && ev.priority && (
                            <span className={`cal-detail-extra cal-detail-pri-${ev.priority}`}>
                              {ev.priority === 'h' ? 'Высокий' : ev.priority === 'l' ? 'Низкий' : 'Средний'}
                            </span>
                          )}
                          {ev.number && (
                            <span className="cal-detail-number">#{ev.number}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Calendar;
