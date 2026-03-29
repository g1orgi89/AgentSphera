import { useState, useRef } from 'react';
import api from '../services/api';
import './ImportModal.css';

const FIELD_LABELS = {
  clientName: 'ФИО',
  clientPhone: 'Телефон',
  clientEmail: 'Email',
  clientBirthday: 'ДР',
  company: 'СК',
  number: '№ договора',
  type: 'Тип',
  startDate: 'Начало',
  endDate: 'Окончание',
  premium: 'Премия',
  carMark: 'Марка',
  plate: 'Гос знак',
  vin: 'VIN',
  note: 'Примечание',
  commission: 'Комиссия',
  address: 'Адрес',
  area: 'Площадь',
  insured: 'Застрахованный',
  age: 'Возраст',
  sumInsured: 'Страх. сумма'
};

const PREVIEW_COLUMNS = ['clientName', 'company', 'number', 'type', 'premium', 'commission', 'startDate', 'endDate', 'carMark', 'plate'];

function formatPreviewValue(field, val) {
  if (val === null || val === undefined || val === '') return '—';
  if (['startDate', 'endDate', 'clientBirthday'].includes(field)) {
    try {
      return new Date(val).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch { return String(val); }
  }
  if (['premium', 'commission'].includes(field)) {
    return Number(val).toLocaleString('ru-RU');
  }
  return String(val);
}

function ImportModal({ onClose, onSuccess }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [preview, setPreview] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState('');

  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setPreview(null);
      setResult(null);
      setError('');
      uploadPreview(f, '');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) {
      setFile(f);
      setPreview(null);
      setResult(null);
      setError('');
      uploadPreview(f, '');
    }
  };

  const uploadPreview = async (f, sheet) => {
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', f);
      if (sheet) formData.append('sheet', sheet);

      const res = await api.post('/import/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setPreview(res.data.data);
      setSelectedSheet(res.data.data.selectedSheet);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обработки файла');
    } finally {
      setLoading(false);
    }
  };

  const handleSheetChange = (e) => {
    const sheet = e.target.value;
    setSelectedSheet(sheet);
    if (file) uploadPreview(file, sheet);
  };

  const handleSave = async () => {
    if (!preview || !preview.rows.length) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/import/save', { rows: preview.rows });
      setResult(res.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDone = () => {
    if (onSuccess) onSuccess();
    onClose();
  };

  const visibleColumns = preview
    ? PREVIEW_COLUMNS.filter(c => preview.mapping[c])
    : [];

  return (
    <div className="import-overlay">
      <div className="import-modal">
        <div className="import-header">
          <h2>Импорт договоров из Excel</h2>
          <button className="import-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {error && <div className="import-error">{error}</div>}

        {result ? (
          <>
            <div className="import-result import-result-success">
              <div className="import-result-item">
                <b>{result.created}</b> договоров импортировано
              </div>
              <div className="import-result-item">
                <b>{result.clientsCreated}</b> новых клиентов создано
              </div>
              <div className="import-result-item">
                <b>{result.clientsFound}</b> существующих клиентов привязано
              </div>
              {result.skipped > 0 && (
                <div className="import-result-item">
                  <b>{result.skipped}</b> пропущено (дубликаты / без клиента)
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="import-result-item" style={{ color: 'var(--danger)' }}>
                  Ошибки: {result.errors.map(e => `стр.${e.row}: ${e.error}`).join('; ')}
                </div>
              )}
            </div>
            <div className="import-actions">
              <button className="import-btn-save" onClick={handleDone}>Готово</button>
            </div>
          </>
        ) : (
          <>
            <div
              className="import-dropzone"
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6v16M10 14l8 8 8-8" stroke="var(--sec)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 26v2a2 2 0 002 2h20a2 2 0 002-2v-2" stroke="var(--sec)" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              {file ? (
                <div className="import-dropzone-file">{file.name}</div>
              ) : (
                <div className="import-dropzone-text">Нажмите или перетащите файл Excel (.xlsx, .xls)</div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
            </div>

            {loading && <div className="import-loading">Обработка файла...</div>}

            {preview && !loading && (
              <>
                {preview.sheets.length > 1 && (
                  <div className="import-sheet-row">
                    <label>Лист:</label>
                    <select value={selectedSheet} onChange={handleSheetChange}>
                      {preview.sheets.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {Object.keys(preview.mapping).length > 0 && (
                  <div className="import-mapping">
                    <div className="import-mapping-title">Распознанные поля ({Object.keys(preview.mapping).length})</div>
                    <div className="import-mapping-list">
                      {Object.entries(preview.mapping).map(([field, header]) => (
                        <span key={field} className="import-mapping-tag">
                          <b>{FIELD_LABELS[field] || field}</b> ← {header}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="import-preview-info">
                  Найдено строк: <b>{preview.totalRows}</b> (предпросмотр первых 10)
                </div>

                {visibleColumns.length > 0 && (
                  <div className="import-preview-table">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          {visibleColumns.map(c => (
                            <th key={c}>{FIELD_LABELS[c] || c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.slice(0, 10).map((row, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            {visibleColumns.map(c => (
                              <td key={c}>{formatPreviewValue(c, row[c])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="import-actions">
                  <button className="import-btn-cancel" onClick={onClose}>Отмена</button>
                  <button
                    className="import-btn-save"
                    onClick={handleSave}
                    disabled={saving || !preview.rows.length}
                  >
                    {saving ? 'Сохранение...' : `Импортировать ${preview.totalRows} договоров`}
                  </button>
                </div>
              </>
            )}

            {!preview && !loading && !file && (
              <div className="import-actions">
                <button className="import-btn-cancel" onClick={onClose}>Отмена</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ImportModal;
