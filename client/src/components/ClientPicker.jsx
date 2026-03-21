import { useState, useEffect, useRef } from 'react';
import api from '../services/api';

function ClientPicker({ value, onChange }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
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

  // Поиск клиентов с дебаунсом
  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/clients', {
          params: { search: search.trim(), limit: 10 }
        });
        setResults(res.data.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

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
        placeholder="Поиск клиента..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          if (search.trim()) setShowDropdown(true);
        }}
      />

      {showDropdown && search.trim() && (
        <div className="client-picker-dropdown">
          {loading ? (
            <div className="client-picker-empty">Поиск...</div>
          ) : results.length === 0 ? (
            <div className="client-picker-empty">Не найдено</div>
          ) : (
            results.map(client => (
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
