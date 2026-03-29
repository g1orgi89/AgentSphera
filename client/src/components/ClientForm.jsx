import { useState } from 'react';

const PREFERRED_CONTACT_OPTIONS = [
  { value: '', label: 'Не указан' },
  { value: 'Телефон', label: 'Телефон' },
  { value: 'Email', label: 'Email' },
  { value: 'Telegram', label: 'Telegram' },
  { value: 'WhatsApp', label: 'WhatsApp' },
  { value: 'СМС', label: 'СМС' },
  { value: 'Звонок', label: 'Звонок' }
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Активный' },
  { value: 'potential', label: 'Потенциальный' },
  { value: 'inactive', label: 'Неактивный' }
];

function ClientForm({ client, onSubmit, onClose }) {
  const isEditing = !!client;

  const [formData, setFormData] = useState({
    name: client?.name || '',
    phone: client?.phone || '',
    email: client?.email || '',
    birthday: client?.birthday ? client.birthday.slice(0, 10) : '',
    preferredContact: client?.preferredContact || '',
    status: client?.status || 'active',
    note: client?.note || '',
    link: client?.link || ''
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Укажите имя клиента');
      return;
    }
    if (formData.name.trim().length < 2) {
      setError('Имя минимум 2 символа');
      return;
    }

    setSubmitting(true);
    try {
      const data = { ...formData };
      data.name = data.name.trim();
      if (data.birthday === '') {
        data.birthday = null;
      }
      await onSubmit(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="client-form-overlay">
      <div className="client-form-modal">
        <div className="client-form-header">
          <h2>{isEditing ? 'Редактировать клиента' : 'Новый клиент'}</h2>
          <button className="client-form-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error && <div className="client-form-error">{error}</div>}

        <form onSubmit={handleSubmit} className="client-form">
          <div className="client-form-field">
            <label htmlFor="cf-name">Имя / ФИО *</label>
            <input
              id="cf-name"
              type="text"
              value={formData.name}
              onChange={handleChange('name')}
              placeholder="Иванов Иван Иванович"
              autoFocus
            />
          </div>

          <div className="client-form-field">
            <label htmlFor="cf-phone">Телефон</label>
            <input
              id="cf-phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange('phone')}
              placeholder="+995 555 123 456"
            />
          </div>

          <div className="client-form-field">
            <label htmlFor="cf-email">Email</label>
            <input
              id="cf-email"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              placeholder="client@example.com"
            />
          </div>

          <div className="client-form-field">
            <label htmlFor="cf-birthday">Дата рождения</label>
            <input
              id="cf-birthday"
              type="date"
              value={formData.birthday}
              onChange={handleChange('birthday')}
            />
          </div>

          <div className="client-form-field">
            <label htmlFor="cf-contact">Предпочтительная связь</label>
            <select
              id="cf-contact"
              value={formData.preferredContact}
              onChange={handleChange('preferredContact')}
            >
              {PREFERRED_CONTACT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="client-form-field">
            <label htmlFor="cf-status">Статус</label>
            <select
              id="cf-status"
              value={formData.status}
              onChange={handleChange('status')}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="client-form-field">
            <label htmlFor="cf-link">Ссылка на документы</label>
            <input
              id="cf-link"
              type="url"
              value={formData.link}
              onChange={handleChange('link')}
              placeholder="https://drive.google.com/..."
            />
          </div>

          <div className="client-form-field">
            <label htmlFor="cf-note">Заметка</label>
            <textarea
              id="cf-note"
              value={formData.note}
              onChange={handleChange('note')}
              placeholder="Комментарий о клиенте..."
              rows={3}
            />
          </div>

          <div className="client-form-actions">
            <button type="button" className="client-form-cancel" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="client-form-submit" disabled={submitting}>
              {submitting ? 'Сохранение...' : (isEditing ? 'Сохранить' : 'Создать')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ClientForm;
