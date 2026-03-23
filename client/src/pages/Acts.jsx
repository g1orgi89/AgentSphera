import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { BurgerButton } from '../components/Layout';
import './Acts.css';

const STATUS_LABELS = {
  ok: 'Совпадает',
  diff: 'Расхождение',
  unknown: 'Не найден'
};

const STATUS_CLASS = {
  ok: 'act-status-ok',
  diff: 'act-status-diff',
  unknown: 'act-status-unknown'
};

function Acts() {
  // --- Список сохранённых актов ---
  const [acts, setActs] = useState([]);
  const [loadingActs, setLoadingActs] = useState(true);

  // --- Режим: 'upload' | 'manual' ---
  const [mode, setMode] = useState('upload');

  // --- Поля формы ---
  const [company, setCompany] = useState('');
  const [period, setPeriod] = useState('');

  // --- Загрузка файла ---
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // --- Обработка ---
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // --- Предпросмотр ---
  const [previewItems, setPreviewItems] = useState(null);
  const [previewSource, setPreviewSource] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  const [saving, setSaving] = useState(false);

  // --- Ручной ввод ---
  const [manualItems, setManualItems] = useState([
    { contractNumber: '', clientName: '', actualAmount: '' }
  ]);

  // --- Загрузка актов ---

  const fetchActs = useCallback(async () => {
    setLoadingActs(true);
    try {
      const res = await api.get('/acts');
      setActs(res.data.data);
    } catch {
      // не критично
    } finally {
      setLoadingActs(false);
    }
  }, []);

  useEffect(() => {
    fetchActs();
  }, [fetchActs]);

  // --- Drag & Drop ---

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError('');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Отправка файла на парсинг ---

  const handleUpload = async () => {
    if (!company.trim()) {
      setError('Укажите страховую компанию');
      return;
    }
    if (!file) {
      setError('Выберите файл');
      return;
    }

    setProcessing(true);
    setError('');
    setPreviewItems(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('company', company.trim());
      formData.append('period', period.trim());

      const res = await api.post('/acts/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setPreviewItems(res.data.data.items);
      setPreviewSource(res.data.data.source);
      setPreviewFileName(res.data.data.originalFileName);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка обработки файла');
    } finally {
      setProcessing(false);
    }
  };

  // --- Редактирование предпросмотра ---

  const updatePreviewItem = (index, field, value) => {
    setPreviewItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: field === 'actualAmount' ? (Number(value) || 0) : value };
      return updated;
    });
  };

  const removePreviewItem = (index) => {
    setPreviewItems(prev => prev.filter((_, i) => i !== index));
  };

  // --- Сохранение акта ---

  const handleSave = async () => {
    if (!previewItems || previewItems.length === 0) return;

    setSaving(true);
    setError('');

    try {
      await api.post('/acts', {
        company: company.trim(),
        period: period.trim(),
        source: previewSource,
        originalFileName: previewFileName,
        items: previewItems
      });

      setSuccess('Акт сохранён');
      setPreviewItems(null);
      setFile(null);
      setCompany('');
      setPeriod('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchActs();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  // --- Ручной ввод ---

  const addManualRow = () => {
    setManualItems(prev => [...prev, { contractNumber: '', clientName: '', actualAmount: '' }]);
  };

  const updateManualItem = (index, field, value) => {
    setManualItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeManualRow = (index) => {
    setManualItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleManualSave = async () => {
    if (!company.trim()) {
      setError('Укажите страховую компанию');
      return;
    }

    const validItems = manualItems.filter(i => i.contractNumber.trim() || i.clientName.trim());
    if (validItems.length === 0) {
      setError('Добавьте хотя бы одну строку');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await api.post('/acts', {
        company: company.trim(),
        period: period.trim(),
        source: 'manual',
        items: validItems.map(i => ({
          contractNumber: i.contractNumber.trim(),
          clientName: i.clientName.trim(),
          actualAmount: Number(i.actualAmount) || 0
        }))
      });

      setSuccess('Акт сохранён');
      setCompany('');
      setPeriod('');
      setManualItems([{ contractNumber: '', clientName: '', actualAmount: '' }]);
      fetchActs();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  // --- Удаление акта ---

  const handleDeleteAct = async (actId) => {
    if (!window.confirm('Удалить акт?')) return;
    try {
      await api.delete(`/acts/${actId}`);
      fetchActs();
    } catch {
      setError('Ошибка удаления');
    }
  };

  // --- Форматирование ---

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('ru-RU', {
      day: '2-digit', month: '2-digit', year: '2-digit'
    });
  };

  const formatCurrency = (num) => {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('ru-RU');
  };

  const getSourceLabel = (source) => {
    const labels = { excel: 'Excel', pdf: 'PDF', csv: 'CSV', manual: 'Ручной' };
    return labels[source] || source;
  };

  const getSummary = (items) => {
    if (!items || items.length === 0) return null;
    const ok = items.filter(i => i.status === 'ok').length;
    const diff = items.filter(i => i.status === 'diff').length;
    const unknown = items.filter(i => i.status === 'unknown').length;
    return { ok, diff, unknown, total: items.length };
  };

  // --- Раскрытие акта ---
  const [expandedAct, setExpandedAct] = useState(null);

  return (
    <div className="acts-page">
      <div className="acts-header">
        <BurgerButton />
        <h1>Акты сверки</h1>
      </div>

      {success && <div className="acts-success">{success}</div>}
      {error && <div className="acts-error">{error}</div>}

      {/* Поля СК и период */}
      <div className="acts-form-fields">
        <div className="acts-field">
          <label>Страховая компания *</label>
          <input
            type="text"
            placeholder="Напр. Ресо, АльфаСтрахование..."
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <div className="acts-field">
          <label>Период</label>
          <input
            type="text"
            placeholder="Напр. Янв 2026, Q1 2026..."
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
      </div>

      {/* Переключатель режима */}
      <div className="acts-mode-toggle">
        <button
          className={`acts-mode-btn ${mode === 'upload' ? 'active' : ''}`}
          onClick={() => { setMode('upload'); setPreviewItems(null); setError(''); }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 2v8M4 6l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Загрузить файл
        </button>
        <button
          className={`acts-mode-btn ${mode === 'manual' ? 'active' : ''}`}
          onClick={() => { setMode('manual'); setPreviewItems(null); setError(''); }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 13h10M3 9l7-7 2 2-7 7H3V9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ручной ввод
        </button>
      </div>

      {/* === РЕЖИМ ЗАГРУЗКИ === */}
      {mode === 'upload' && !previewItems && (
        <>
          <div
            className={`acts-dropzone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            {file ? (
              <div className="acts-dropzone-file">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="var(--sec)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M14 2v6h6" stroke="var(--sec)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="acts-dropzone-filename">{file.name}</span>
                <button className="acts-dropzone-clear" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="acts-dropzone-placeholder">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 8v16M12 16l8-8 8 8" stroke="var(--sec)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                  <path d="M6 28h28" stroke="var(--sec)" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
                </svg>
                <p>Перетащите файл сюда или нажмите для выбора</p>
                <span className="acts-dropzone-hint">Excel (.xlsx, .xls), PDF, CSV • макс. 5MB</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.pdf,.csv"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>

          <button
            className="acts-upload-btn"
            onClick={handleUpload}
            disabled={processing || !file || !company.trim()}
          >
            {processing ? (
              <>
                <span className="acts-spinner"></span>
                AI распознаёт документ...
              </>
            ) : (
              'Распознать и сверить'
            )}
          </button>
        </>
      )}

      {/* === ПРЕДПРОСМОТР === */}
      {previewItems && (
        <div className="acts-preview">
          <div className="acts-preview-header">
            <h2>Распознанные данные</h2>
            <span className="acts-preview-count">{previewItems.length} строк</span>
          </div>

          {(() => {
            const s = getSummary(previewItems);
            return s ? (
              <div className="acts-preview-summary">
                <span className="act-status-ok">{s.ok} совпад.</span>
                <span className="act-status-diff">{s.diff} расхожд.</span>
                <span className="act-status-unknown">{s.unknown} не найд.</span>
              </div>
            ) : null;
          })()}

          <div className="acts-preview-table-wrap">
            <table className="acts-preview-table">
              <thead>
                <tr>
                  <th>№ договора</th>
                  <th>Клиент</th>
                  <th>КВ ожид.</th>
                  <th>КВ факт.</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {previewItems.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        value={item.contractNumber}
                        onChange={(e) => updatePreviewItem(idx, 'contractNumber', e.target.value)}
                        className="acts-cell-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={item.clientName}
                        onChange={(e) => updatePreviewItem(idx, 'clientName', e.target.value)}
                        className="acts-cell-input"
                      />
                    </td>
                    <td className="acts-cell-num">{formatCurrency(item.expectedAmount)}</td>
                    <td>
                      <input
                        type="number"
                        value={item.actualAmount}
                        onChange={(e) => updatePreviewItem(idx, 'actualAmount', e.target.value)}
                        className="acts-cell-input acts-cell-input-num"
                      />
                    </td>
                    <td>
                      <span className={`acts-status-badge ${STATUS_CLASS[item.status] || ''}`}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td>
                      <button className="acts-row-delete" onClick={() => removePreviewItem(idx)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="acts-preview-actions">
            <button
              className="acts-cancel-btn"
              onClick={() => { setPreviewItems(null); clearFile(); }}
            >
              Отмена
            </button>
            <button
              className="acts-save-btn"
              onClick={handleSave}
              disabled={saving || previewItems.length === 0}
            >
              {saving ? 'Сохранение...' : 'Сохранить акт'}
            </button>
          </div>
        </div>
      )}

      {/* === РУЧНОЙ ВВОД === */}
      {mode === 'manual' && !previewItems && (
        <div className="acts-manual">
          <div className="acts-manual-table-wrap">
            <table className="acts-manual-table">
              <thead>
                <tr>
                  <th>№ договора</th>
                  <th>Клиент</th>
                  <th>Сумма КВ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {manualItems.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input
                        type="text"
                        placeholder="№ договора"
                        value={item.contractNumber}
                        onChange={(e) => updateManualItem(idx, 'contractNumber', e.target.value)}
                        className="acts-cell-input"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        placeholder="Имя клиента"
                        value={item.clientName}
                        onChange={(e) => updateManualItem(idx, 'clientName', e.target.value)}
                        className="acts-cell-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.actualAmount}
                        onChange={(e) => updateManualItem(idx, 'actualAmount', e.target.value)}
                        className="acts-cell-input acts-cell-input-num"
                      />
                    </td>
                    <td>
                      {manualItems.length > 1 && (
                        <button className="acts-row-delete" onClick={() => removeManualRow(idx)}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button className="acts-add-row-btn" onClick={addManualRow}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Добавить строку
          </button>

          <button
            className="acts-save-btn"
            onClick={handleManualSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сверить и сохранить'}
          </button>
        </div>
      )}

      {/* === СПИСОК СОХРАНЁННЫХ АКТОВ === */}
      <div className="acts-saved">
        <div className="acts-saved-header">
          <h2>Сохранённые акты</h2>
        </div>

        {loadingActs ? (
          <div className="acts-loading">Загрузка...</div>
        ) : acts.length === 0 ? (
          <div className="acts-empty">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="10" y="7" width="28" height="34" rx="3" stroke="var(--sec)" strokeWidth="1.5" fill="none" opacity="0.4" />
              <path d="M17 17h14M17 23h14M17 29h10" stroke="var(--sec)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            </svg>
            <p>Пока нет сохранённых актов</p>
          </div>
        ) : (
          <div className="acts-list">
            {acts.map(act => {
              const summary = getSummary(act.items);
              const isExpanded = expandedAct === act._id;
              return (
                <div key={act._id} className="act-card">
                  <div
                    className="act-card-header"
                    onClick={() => setExpandedAct(isExpanded ? null : act._id)}
                  >
                    <div className="act-card-info">
                      <span className="act-card-company">{act.company}</span>
                      {act.period && <span className="act-card-period">{act.period}</span>}
                      <span className="act-card-date">{formatDate(act.date)}</span>
                      <span className="act-card-source">{getSourceLabel(act.source)}</span>
                    </div>
                    <div className="act-card-stats">
                      {summary && (
                        <>
                          <span className="act-stat-ok">{summary.ok}</span>
                          <span className="act-stat-diff">{summary.diff}</span>
                          <span className="act-stat-unknown">{summary.unknown}</span>
                        </>
                      )}
                      <span className="act-card-total">{act.items.length} стр.</span>
                      <button
                        className="act-card-delete"
                        onClick={(e) => { e.stopPropagation(); handleDeleteAct(act._id); }}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                      <svg className={`act-card-chevron ${isExpanded ? 'expanded' : ''}`} width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="act-card-body">
                      <table className="act-detail-table">
                        <thead>
                          <tr>
                            <th>№ договора</th>
                            <th>Клиент</th>
                            <th>КВ ожид.</th>
                            <th>КВ факт.</th>
                            <th>Статус</th>
                          </tr>
                        </thead>
                        <tbody>
                          {act.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.contractNumber || '—'}</td>
                              <td>{item.clientName || '—'}</td>
                              <td className="acts-cell-num">{formatCurrency(item.expectedAmount)}</td>
                              <td className="acts-cell-num">{formatCurrency(item.actualAmount)}</td>
                              <td>
                                <span className={`acts-status-badge ${STATUS_CLASS[item.status] || ''}`}>
                                  {STATUS_LABELS[item.status] || item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Acts;
