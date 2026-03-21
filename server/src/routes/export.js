const express = require('express');
const ExcelJS = require('exceljs');
const { protect } = require('../middleware/auth');
const Contract = require('../models/Contract');

const router = express.Router();

router.use(protect);

// GET /api/v1/export/xlsx — экспорт договоров в Excel
router.get('/xlsx', async (req, res) => {
  try {
    // Без lean() — чтобы виртуальные поля (status, commissionAmount) работали
    const contractDocs = await Contract.find({ userId: req.user._id })
      .populate('clientId', 'name phone email')
      .sort({ createdAt: -1 });

    // Конвертируем в plain objects с виртуальными полями
    const contracts = contractDocs.map(doc => doc.toJSON());

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
      { header: 'Дата начала', key: 'startDate', width: 16 },
      { header: 'Дата окончания', key: 'endDate', width: 16 },
      { header: 'Статус', key: 'status', width: 18 },
      { header: 'Премия', key: 'premium', width: 16 },
      { header: 'КВ тип', key: 'commissionType', width: 10 },
      { header: 'КВ значение', key: 'commissionValue', width: 14 },
      { header: 'КВ сумма', key: 'commissionAmount', width: 14 },
      { header: 'Взносы', key: 'installments', width: 14 },
      { header: 'Заметка', key: 'note', width: 30 }
    ];

    // --- Стиль границ ---
    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
      right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
    };

    const headerBorder = {
      top: { style: 'thin', color: { argb: 'FF01575C' } },
      left: { style: 'thin', color: { argb: 'FF01575C' } },
      bottom: { style: 'medium', color: { argb: 'FF01575C' } },
      right: { style: 'thin', color: { argb: 'FF01575C' } }
    };

    // --- Стили шапки ---
    const headerRow = sheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF01575C' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = headerBorder;
    });

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

    contracts.forEach((contract) => {
      const client = contract.clientId || {};
      const clientName = client.name || '—';
      const clientPhone = client.phone || '';
      const clientEmail = client.email || '';

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
        startDate: contract.startDate ? new Date(contract.startDate) : null,
        endDate: contract.endDate ? new Date(contract.endDate) : null,
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
    const dataRowCount = contracts.length;
    for (let i = 2; i <= dataRowCount + 1; i++) {
      const row = sheet.getRow(i);
      row.alignment = { vertical: 'middle', wrapText: true };
      row.height = 22;

      // Чередование цвета строк
      if (i % 2 === 0) {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F0F0' }
          };
        });
      }

      // Границы для каждой ячейки
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = thinBorder;
      });
    }

    // Формат дат
    sheet.getColumn('startDate').numFmt = 'DD.MM.YYYY';
    sheet.getColumn('endDate').numFmt = 'DD.MM.YYYY';

    // Числовой формат для сумм
    sheet.getColumn('premium').numFmt = '#,##0';
    sheet.getColumn('commissionValue').numFmt = '#,##0';
    sheet.getColumn('commissionAmount').numFmt = '#,##0';

    // --- Строка ИТОГО ---
    if (dataRowCount > 0) {
      const totalRowIdx = dataRowCount + 2;
      const lastDataRow = dataRowCount + 1;

      const totalRow = sheet.getRow(totalRowIdx);
      totalRow.height = 28;

      // Ячейка A — надпись «Итого»
      const cellA = totalRow.getCell('A');
      cellA.value = `ИТОГО (${dataRowCount})`;
      cellA.font = { bold: true, size: 11, color: { argb: 'FF01575C' } };
      cellA.alignment = { vertical: 'middle' };

      // Премия — SUM формула
      const cellK = totalRow.getCell('K');
      cellK.value = { formula: `SUM(K2:K${lastDataRow})` };
      cellK.numFmt = '#,##0';
      cellK.font = { bold: true, size: 11 };

      // КВ сумма — SUM формула
      const cellN = totalRow.getCell('N');
      cellN.value = { formula: `SUM(N2:N${lastDataRow})` };
      cellN.numFmt = '#,##0';
      cellN.font = { bold: true, size: 11, color: { argb: 'FF3CA8A8' } };

      // КВ значение — SUM формула
      const cellM = totalRow.getCell('M');
      cellM.value = { formula: `SUM(M2:M${lastDataRow})` };
      cellM.numFmt = '#,##0';
      cellM.font = { bold: true, size: 11 };

      // Стиль строки итого — верхняя граница толстая
      const totalBorder = {
        top: { style: 'medium', color: { argb: 'FF01575C' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'medium', color: { argb: 'FF01575C' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
      };

      totalRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = totalBorder;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFECE3E4' }
        };
      });
    }

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
