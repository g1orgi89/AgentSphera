import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

function ClientPicker({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [allClients, setAllClients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(value || null);
  const wrapperRef = useRef(null);

  // Закрытие по клику вне
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Загрузить всех клиентов при монтировании
  useEffect(() => {
    const loadClients = async () => {
      setLoading(true);
      try {
        const res = await api.get('/clients', {
          params: { limit: 200, sort: 'name' }
        });
        setAllClients(res.data.data || []);
      } catch {
        setAllClients([]);
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, []);

  // Фильтрация по вводу
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(allClients);
    } else {
      const s = search.trim().toLowerCase();
      setFiltered(
        allClients.filter(c =>
          c.name.toLowerCase().includes(s) ||
          (c.phone && c.phone.includes(s)) ||
          (c.email && c.email.toLowerCase().includes(s))
        )
      );
    }
  }, [search, allClients]);

  const handleSelect = (client) => {
    setSelected(client);
    setShowDropdown(false);
    setSearch('');
    onChange(client);
  };

  const handleClear = () => {
    setSelected(null);
    setSearch('');
    onChange(null);
  };

  if (selected) {
    return (
      <div className="client-picker-selected">
        <span>{selected.name}</span>
        <button type="button" className="client-picker-clear" onClick={handleClear}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="client-picker" ref={wrapperRef}>
      <input
        type="text"
        className="client-picker-input"
        placeholder="Выберите клиента или начните ввод..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
      />

      {showDropdown && (
        <div className="client-picker-dropdown">
          {loading ? (
            <div className="client-picker-empty">Загрузка...</div>
          ) : filtered.length === 0 ? (
            <div className="client-picker-empty">
              {search.trim() ? 'Не найдено' : 'Нет клиентов'}
            </div>
          ) : (
            filtered.map(client => (
              <div
                key={client._id}
                className="client-picker-option"
                onClick={() => handleSelect(client)}
              >
                {client.name}
                {client.phone && <span style={{ color: 'var(--text-light)', marginLeft: 8 }}>{client.phone}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default ClientPicker;
