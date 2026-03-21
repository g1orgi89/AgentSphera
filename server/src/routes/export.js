const express = require('express');
const ExcelJS = require('exceljs');
const { protect } = require('../middleware/auth');
const Contract = require('../models/Contract');

const router = express.Router();

router.use(protect);

// GET /api/v1/export/xlsx — экспорт договоров в Excel
router.get('/xlsx', async (req, res) => {
  try {
    const contracts = await Contract.find({ userId: req.user._id })
      .populate('clientId', 'name phone email')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'АгентСфера';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Договоры');

    // --- Колонки ---
    sheet.columns = [
      { header: 'Клиент', key: 'client', width: 28 },
      { header: 'Телефон', key: 'phone', width: 18 },
      { header: 'Email', key: 'email', width: 24 },
      { header: 'СК', key: 'company', width: 22 },
      { header: 'Тип', key: 'type', width: 16 },
      { header: '№ договора', key: 'number', width: 18 },
      { header: 'Объект', key: 'objectType', width: 14 },
      { header: 'Дата начала', key: 'startDate', width: 14 },
      { header: 'Дата окончания', key: 'endDate', width: 14 },
      { header: 'Статус', key: 'status', width: 16 },
      { header: 'Премия', key: 'premium', width: 14 },
      { header: 'КВ тип', key: 'commissionType', width: 10 },
      { header: 'КВ значение', key: 'commissionValue', width: 14 },
      { header: 'КВ сумма', key: 'commissionAmount', width: 14 },
      { header: 'Взносы (оплачено/всего)', key: 'installments', width: 24 },
      { header: 'Заметка', key: 'note', width: 30 }
    ];

    // --- Стили шапки ---
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF01575C' }
    };
    headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 28;

    // --- Маппинг данных ---
    const STATUS_LABELS = {
      active: 'Действующий',
      expiring_7: 'Истекает (7 дн.)',
      expiring_14: 'Истекает (14 дн.)',
      expiring_30: 'Истекает (30 дн.)',
      expired: 'Истёк'
    };

    const OBJECT_LABELS = {
      auto: 'Авто',
      realty: 'Недвижимость',
      life: 'Жизнь'
    };

    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}.${month}.${year}`;
    };

    contracts.forEach((contract) => {
      const clientName = contract.clientId ? contract.clientId.name : '—';
      const clientPhone = contract.clientId ? (contract.clientId.phone || '') : '';
      const clientEmail = contract.clientId ? (contract.clientId.email || '') : '';

      const paidCount = (contract.installments || []).filter(i => i.paid).length;
      const totalCount = (contract.installments || []).length;
      const installmentsStr = totalCount > 0 ? `${paidCount}/${totalCount}` : '—';

      sheet.addRow({
        client: clientName,
        phone: clientPhone,
        email: clientEmail,
        company: contract.company || '',
        type: contract.type || '',
        number: contract.number || '',
        objectType: OBJECT_LABELS[contract.objectType] || '',
        startDate: formatDate(contract.startDate),
        endDate: formatDate(contract.endDate),
        status: STATUS_LABELS[contract.status] || contract.status || '',
        premium: contract.premium || 0,
        commissionType: contract.commissionType === '%' ? '%' : 'Фикс.',
        commissionValue: contract.commissionValue || 0,
        commissionAmount: contract.commissionAmount || 0,
        installments: installmentsStr,
        note: contract.note || ''
      });
    });

    // --- Стили данных ---
    for (let i = 2; i <= contracts.length + 1; i++) {
      const row = sheet.getRow(i);
      row.alignment = { vertical: 'middle', wrapText: true };

      // Чередование цвета строк
      if (i % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F0F0' }
        };
      }
    }

    // Числовой формат для премии и КВ
    sheet.getColumn('premium').numFmt = '#,##0';
    sheet.getColumn('commissionValue').numFmt = '#,##0';
    sheet.getColumn('commissionAmount').numFmt = '#,##0';

    // Автофильтр
    sheet.autoFilter = {
      from: 'A1',
      to: `P1`
    };

    // Закрепить шапку
    sheet.views = [
      { state: 'frozen', ySplit: 1 }
    ];

    // --- Отправка ---
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const filename = `contracts_${dateStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, error: 'Ошибка экспорта' });
  }
});

module.exports = router;
