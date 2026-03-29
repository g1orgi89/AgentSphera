import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import ClientPicker from './ClientPicker';
import ClientForm from './ClientForm';
import './ContractForm.css';

const STEP_LABELS = ['Договор + взносы', 'Объект', 'Сводка'];

const OBJECT_TYPES = [
  { value: '', label: 'Не указан' },
  { value: 'auto', label: 'Автомобиль' },
  { value: 'realty', label: 'Недвижимость' },
  { value: 'life', label: 'Жизнь' }
];

function Combo({ value, onChange, placeholder, suggestions }) {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!value.trim()) {
      setFiltered(suggestions);
    } else {
      const lower = value.toLowerCase();
      setFiltered(suggestions.filter(s => s.toLowerCase().includes(lower)));
    }
  }, [value, suggestions]);

  return (
    <div className="combo" ref={wrapperRef}>
      <input
        className="combo-input"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div className="combo-dropdown">
          {filtered.map((item, i) => (
            <div
              key={i}
              className="combo-option"
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContractForm({ contract, clientId, onSubmit, onClose }) {
  const isEditing = !!contract;
  const showClientPicker = !clientId;

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [typeSuggestions, setTypeSuggestions] = useState([]);

  const [formData, setFormData] = useState({
    clientId: clientId || contract?.clientId?._id || contract?.clientId || '',
    clientName: contract?.clientId?.name || '',
    company: contract?.company || '',
    number: contract?.number || '',
    type: contract?.type || '',
    startDate: contract?.startDate ? contract.startDate.slice(0, 10) : '',
    endDate: contract?.endDate ? contract.endDate.slice(0, 10) : '',
    premium: contract?.premium ?? '',
    commissionType: contract?.commissionType || '%',
    commissionValue: contract?.commissionValue ?? '',
    note: contract?.note || '',
    link: contract?.link || '',
    objectType: contract?.objectType || '',
    objectData: {
      car: contract?.objectData?.car || '',
      plate: contract?.objectData?.plate || '',
      vin: contract?.objectData?.vin || '',
      realtyType: contract?.objectData?.realtyType || '',
      address: contract?.objectData?.address || '',
      area: contract?.objectData?.area ?? '',
      insured: contract?.objectData?.insured || '',
      age: contract?.objectData?.age ?? '',
      sumInsured: contract?.objectData?.sumInsured ?? ''
    },
    installments: contract?.installments?.map(inst => ({
      amount: inst.amount ?? '',
      dueDate: inst.dueDate ? inst.dueDate.slice(0, 10) : '',
      paid: inst.paid || false,
      paidDate: inst.paidDate ? inst.paidDate.slice(0, 10) : ''
    })) || []
  });

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const res = await api.get('/contracts', { params: { limit: 100 } });
        const contracts = res.data.data || [];
        const companies = [...new Set(contracts.map(c => c.company).filter(Boolean))];
        const types = [...new Set(contracts.map(c => c.type).filter(Boolean))];
        setCompanySuggestions(companies.sort());
        setTypeSuggestions(types.sort());
      } catch {}
    };
    loadSuggestions();
  }, []);

  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleObjectDataChange = (field) => (e) => {
    setFormData(prev => ({
      ...prev,
      objectData: { ...prev.objectData, [field]: e.target.value }
    }));
  };

  const addInstallment = () => {
    if (formData.installments.length >= 4) return;
    setFormData(prev => ({
      ...prev,
      installments: [...prev.installments, { amount: '', dueDate: '', paid: false, paidDate: '' }]
    }));
  };

  const removeInstallment = (idx) => {
    setFormData(prev => ({
      ...prev,
      installments: prev.installments.filter((_, i) => i !== idx)
    }));
  };

  const updateInstallment = (idx, field, value) => {
    setFormData(prev => {
      const updated = [...prev.installments];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, installments: updated };
    });
  };

  const handleClientSelect = (client) => {
    if (client) {
      setFormData(prev => ({ ...prev, clientId: client._id, clientName: client.name }));
    } else {
      setFormData(prev => ({ ...prev, clientId: '', clientName: '' }));
    }
  };

  const handleNewClientSubmit = async (clientData) => {
    const res = await api.post('/clients', clientData);
    const newClient = res.data.data;
    setFormData(prev => ({ ...prev, clientId: newClient._id, clientName: newClient.name }));
    setShowNewClient(false);
  };

  const validateStep1 = () => {
    if (!formData.clientId) return 'Выберите клиента';
    if (!formData.company.trim()) return 'Укажите страховую компанию';
    if (!formData.type.trim()) return 'Укажите тип договора';
    if (formData.premium === '' || Number(formData.premium) < 0) return 'Укажите премию (>= 0)';
    if (formData.startDate && formData.endDate && formData.endDate < formData.startDate) {
      return 'Дата окончания не может быть раньше даты начала';
    }
    if (formData.installments.length > 4) return 'Максимум 4 взноса';
    for (let i = 0; i < formData.installments.length; i++) {
      const inst = formData.installments[i];
      if (inst.amount === '' || Number(inst.amount) < 0) {
        return `Взнос ${i + 1}: укажите сумму (>= 0)`;
      }
      if (!inst.dueDate) {
        return `Взнос ${i + 1}: укажите дату`;
      }
    }
    return null;
  };

  const goNext = () => {
    setError('');
    if (step === 1) {
      const err = validateStep1();
      if (err) { setError(err); return; }
    }
    setStep(prev => Math.min(prev + 1, 3));
  };

  const goBack = () => {
    setError('');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        clientId: formData.clientId,
        company: formData.company.trim(),
        number: formData.number.trim(),
        type: formData.type.trim(),
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        objectType: formData.objectType || '',
        objectData: {},
        premium: Number(formData.premium),
        commissionType: formData.commissionType,
        commissionValue: Number(formData.commissionValue) || 0,
        installments: formData.installments.map(inst => ({
          amount: Number(inst.amount),
          dueDate: inst.dueDate,
          paid: inst.paid || false,
          paidDate: inst.paidDate || null
        })),
        note: formData.note.trim(),
        link: formData.link.trim()
      };

      if (formData.objectType === 'auto') {
        payload.objectData = {
          car: formData.objectData.car.trim(),
          plate: formData.objectData.plate.trim(),
          vin: formData.objectData.vin.trim()
        };
      } else if (formData.objectType === 'realty') {
        payload.objectData = {
          realtyType: formData.objectData.realtyType.trim(),
          address: formData.objectData.address.trim(),
          area: formData.objectData.area ? Number(formData.objectData.area) : null
        };
      } else if (formData.objectType === 'life') {
        payload.objectData = {
          insured: formData.objectData.insured.trim(),
          age: formData.objectData.age ? Number(formData.objectData.age) : null,
          sumInsured: formData.objectData.sumInsured ? Number(formData.objectData.sumInsured) : null
        };
      }

      await onSubmit(payload);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  const calcCommission = () => {
    const premium = Number(formData.premium) || 0;
    const value = Number(formData.commissionValue) || 0;
    if (formData.commissionType === '%') {
      return Math.round(premium * value / 100);
    }
    return value;
  };

  const renderStep1 = () => (
    <div className="contract-form">
      {showClientPicker && (
        <div className="contract-client-section">
          <div className="contract-form-field">
            <label>Клиент *</label>
            <ClientPicker
              value={formData.clientId ? { _id: formData.clientId, name: formData.clientName } : null}
              onChange={handleClientSelect}
            />
          </div>
          <button
            type="button"
            className="contract-new-client-btn"
            onClick={() => setShowNewClient(true)}
          >
            + Новый
          </button>
        </div>
      )}

      <div className="contract-form-field">
        <label>Страховая компания *</label>
        <Combo
          value={formData.company}
          onChange={(val) => setFormData(prev => ({ ...prev, company: val }))}
          placeholder="Ингосстрах, РЕСО, Согаз..."
          suggestions={companySuggestions}
        />
      </div>

      <div className="contract-form-row">
        <div className="contract-form-field">
          <label>Номер договора</label>
          <input
            type="text"
            value={formData.number}
            onChange={handleChange('number')}
            placeholder="INS-2026-001"
          />
        </div>
        <div className="contract-form-field">
          <label>Тип *</label>
          <Combo
            value={formData.type}
            onChange={(val) => setFormData(prev => ({ ...prev, type: val }))}
            placeholder="КАСКО, ОСАГО, ДМС..."
            suggestions={typeSuggestions}
          />
        </div>
      </div>

      <div className="contract-form-row">
        <div className="contract-form-field">
          <label>Дата начала</label>
          <input
            type="date"
            value={formData.startDate}
            onChange={handleChange('startDate')}
          />
        </div>
        <div className="contract-form-field">
          <label>Дата окончания</label>
          <input
            type="date"
            value={formData.endDate}
            onChange={handleChange('endDate')}
          />
        </div>
      </div>

      <div className="contract-form-row">
        <div className="contract-form-field">
          <label>Премия *</label>
          <input
            type="number"
            min="0"
            value={formData.premium}
            onChange={handleChange('premium')}
            placeholder="85000"
          />
        </div>
        <div className="contract-form-field">
          <label>Комиссия</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <select
              value={formData.commissionType}
              onChange={handleChange('commissionType')}
              style={{ width: 70 }}
            >
              <option value="%">%</option>
              <option value="fix">Фикс</option>
            </select>
            <input
              type="number"
              min="0"
              value={formData.commissionValue}
              onChange={handleChange('commissionValue')}
              placeholder={formData.commissionType === '%' ? '15' : '5000'}
              style={{ flex: 1 }}
            />
          </div>
        </div>
      </div>

      <div className="installments-section">
        <div className="installments-header">
          <span>Взносы ({formData.installments.length}/4)</span>
          <button
            type="button"
            className="installments-add"
            onClick={addInstallment}
            disabled={formData.installments.length >= 4}
          >
            + Добавить
          </button>
        </div>

        {formData.installments.length === 0 && (
          <div className="installments-empty">Нет взносов</div>
        )}

        {formData.installments.map((inst, idx) => (
          <div key={idx} className="installment-item">
            <div className="installment-field">
              <label>Сумма</label>
              <input
                type="number"
                min="0"
                value={inst.amount}
                onChange={(e) => updateInstallment(idx, 'amount', e.target.value)}
                placeholder="42500"
              />
            </div>
            <div className="installment-field">
              <label>Дата</label>
              <input
                type="date"
                value={inst.dueDate}
                onChange={(e) => updateInstallment(idx, 'dueDate', e.target.value)}
              />
            </div>
            <div className="installment-field" style={{ maxWidth: 80 }}>
              <label>Оплачен</label>
              <select
                value={inst.paid ? 'yes' : 'no'}
                onChange={(e) => updateInstallment(idx, 'paid', e.target.value === 'yes')}
              >
                <option value="no">Нет</option>
                <option value="yes">Да</option>
              </select>
            </div>
            <button
              type="button"
              className="installment-remove"
              onClick={() => removeInstallment(idx)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="contract-form-field">
        <label>Ссылка на документы</label>
        <input
          type="url"
          value={formData.link}
          onChange={handleChange('link')}
          placeholder="https://drive.google.com/..."
        />
      </div>

      <div className="contract-form-field">
        <label>Заметка</label>
        <textarea
          value={formData.note}
          onChange={handleChange('note')}
          placeholder="Комментарий к договору..."
          rows={2}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="contract-form">
      <div className="contract-form-field">
        <label>Тип объекта</label>
        <select
          value={formData.objectType}
          onChange={handleChange('objectType')}
        >
          {OBJECT_TYPES.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {formData.objectType === 'auto' && (
        <>
          <div className="contract-form-field">
            <label>Автомобиль</label>
            <input type="text" value={formData.objectData.car} onChange={handleObjectDataChange('car')} placeholder="Toyota Camry 2024" />
          </div>
          <div className="contract-form-row">
            <div className="contract-form-field">
              <label>Гос. номер</label>
              <input type="text" value={formData.objectData.plate} onChange={handleObjectDataChange('plate')} placeholder="А123БВ777" />
            </div>
            <div className="contract-form-field">
              <label>VIN</label>
              <input type="text" value={formData.objectData.vin} onChange={handleObjectDataChange('vin')} placeholder="XW7BF4FK60S123456" />
            </div>
          </div>
        </>
      )}

      {formData.objectType === 'realty' && (
        <>
          <div className="contract-form-field">
            <label>Тип недвижимости</label>
            <input type="text" value={formData.objectData.realtyType} onChange={handleObjectDataChange('realtyType')} placeholder="Квартира, дом, офис..." />
          </div>
          <div className="contract-form-field">
            <label>Адрес</label>
            <input type="text" value={formData.objectData.address} onChange={handleObjectDataChange('address')} placeholder="г. Москва, ул. Примерная, д. 1" />
          </div>
          <div className="contract-form-field">
            <label>Площадь (м²)</label>
            <input type="number" min="0" value={formData.objectData.area} onChange={handleObjectDataChange('area')} placeholder="85" />
          </div>
        </>
      )}

      {formData.objectType === 'life' && (
        <>
          <div className="contract-form-field">
            <label>Застрахованный</label>
            <input type="text" value={formData.objectData.insured} onChange={handleObjectDataChange('insured')} placeholder="ФИО застрахованного" />
          </div>
          <div className="contract-form-row">
            <div className="contract-form-field">
              <label>Возраст</label>
              <input type="number" min="0" value={formData.objectData.age} onChange={handleObjectDataChange('age')} placeholder="35" />
            </div>
            <div className="contract-form-field">
              <label>Страховая сумма</label>
              <input type="number" min="0" value={formData.objectData.sumInsured} onChange={handleObjectDataChange('sumInsured')} placeholder="1000000" />
            </div>
          </div>
        </>
      )}

      {!formData.objectType && (
        <div style={{ color: 'var(--text-light)', fontSize: '0.875rem', textAlign: 'center', padding: 20 }}>
          Выберите тип объекта или пропустите этот шаг
        </div>
      )}
    </div>
  );

  const renderStep3 = () => {
    const commission = calcCommission();
    const objectLabel = OBJECT_TYPES.find(o => o.value === formData.objectType)?.label || '—';

    return (
      <div className="contract-summary">
        <div className="contract-summary-section">
          <h3>Договор</h3>
          {showClientPicker && (
            <div className="contract-summary-row">
              <span className="label">Клиент</span>
              <span className="value">{formData.clientName || '—'}</span>
            </div>
          )}
          <div className="contract-summary-row">
            <span className="label">СК</span>
            <span className="value">{formData.company}</span>
          </div>
          <div className="contract-summary-row">
            <span className="label">Тип</span>
            <span className="value">{formData.type}</span>
          </div>
          {formData.number && (
            <div className="contract-summary-row">
              <span className="label">Номер</span>
              <span className="value">{formData.number}</span>
            </div>
          )}
          <div className="contract-summary-row">
            <span className="label">Период</span>
            <span className="value">
              {formData.startDate || '—'} — {formData.endDate || '—'}
            </span>
          </div>
          <div className="contract-summary-row">
            <span className="label">Премия</span>
            <span className="value">{Number(formData.premium).toLocaleString('ru-RU')} ₽</span>
          </div>
          <div className="contract-summary-row">
            <span className="label">Комиссия</span>
            <span className="value">
              <span className="contract-summary-commission">
                {commission.toLocaleString('ru-RU')} ₽
              </span>
              {' '}
              ({formData.commissionType === '%' ? `${formData.commissionValue}%` : 'фикс'})
            </span>
          </div>
        </div>

        {formData.installments.length > 0 && (
          <div className="contract-summary-section">
            <h3>Взносы ({formData.installments.length})</h3>
            {formData.installments.map((inst, idx) => (
              <div key={idx} className="contract-summary-row">
                <span className="label">Взнос {idx + 1} — {inst.dueDate}</span>
                <span className="value">
                  {Number(inst.amount).toLocaleString('ru-RU')} ₽
                  {inst.paid ? ' (оплачен)' : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        {formData.objectType && (
          <div className="contract-summary-section">
            <h3>Объект: {objectLabel}</h3>
            {formData.objectType === 'auto' && (
              <>
                {formData.objectData.car && (<div className="contract-summary-row"><span className="label">Авто</span><span className="value">{formData.objectData.car}</span></div>)}
                {formData.objectData.plate && (<div className="contract-summary-row"><span className="label">Номер</span><span className="value">{formData.objectData.plate}</span></div>)}
                {formData.objectData.vin && (<div className="contract-summary-row"><span className="label">VIN</span><span className="value">{formData.objectData.vin}</span></div>)}
              </>
            )}
            {formData.objectType === 'realty' && (
              <>
                {formData.objectData.realtyType && (<div className="contract-summary-row"><span className="label">Тип</span><span className="value">{formData.objectData.realtyType}</span></div>)}
                {formData.objectData.address && (<div className="contract-summary-row"><span className="label">Адрес</span><span className="value">{formData.objectData.address}</span></div>)}
                {formData.objectData.area && (<div className="contract-summary-row"><span className="label">Площадь</span><span className="value">{formData.objectData.area} м²</span></div>)}
              </>
            )}
            {formData.objectType === 'life' && (
              <>
                {formData.objectData.insured && (<div className="contract-summary-row"><span className="label">Застрахованный</span><span className="value">{formData.objectData.insured}</span></div>)}
                {formData.objectData.age && (<div className="contract-summary-row"><span className="label">Возраст</span><span className="value">{formData.objectData.age}</span></div>)}
                {formData.objectData.sumInsured && (<div className="contract-summary-row"><span className="label">Страховая сумма</span><span className="value">{Number(formData.objectData.sumInsured).toLocaleString('ru-RU')} ₽</span></div>)}
              </>
            )}
          </div>
        )}

        {(formData.link || formData.note) && (
          <div className="contract-summary-section">
            <h3>Дополнительно</h3>
            {formData.link && (
              <div className="contract-summary-row">
                <span className="label">Документы</span>
                <span className="value">
                  <a href={formData.link} target="_blank" rel="noopener noreferrer">Открыть</a>
                </span>
              </div>
            )}
            {formData.note && (
              <div className="contract-summary-row">
                <span className="label">Заметка</span>
                <span className="value">{formData.note}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="contract-form-overlay">
      <div className="contract-form-modal">
        <div className="contract-form-header">
          <h2>{isEditing ? 'Редактировать договор' : 'Новый договор'}</h2>
          <button className="contract-form-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="contract-form-steps">
          {STEP_LABELS.map((label, idx) => (
            <div
              key={idx}
              className={`contract-form-step${
                step === idx + 1 ? ' active' : step > idx + 1 ? ' done' : ''
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {error && <div className="contract-form-error">{error}</div>}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <div className="contract-form-actions">
          {step === 1 && (
            <button type="button" className="contract-form-cancel" onClick={onClose}>
              Отмена
            </button>
          )}
          {step > 1 && (
            <button type="button" className="contract-form-back" onClick={goBack}>
              Назад
            </button>
          )}
          {step < 3 && (
            <button type="button" className="contract-form-next" onClick={goNext}>
              Далее
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              className="contract-form-submit"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Сохранение...' : (isEditing ? 'Сохранить' : 'Создать')}
            </button>
          )}
        </div>
      </div>

      {showNewClient && (
        <ClientForm
          onSubmit={handleNewClientSubmit}
          onClose={() => setShowNewClient(false)}
        />
      )}
    </div>
  );
}

export default ContractForm;
