const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth');
const { getSheetNames, parseSheet, saveImport } = require('../services/importService');

const router = express.Router();

router.use(protect);

// --- Multer ---

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = (file.originalname || '').toLowerCase().split('.').pop();
  if (['xlsx', 'xls'].includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Допустимые форматы: Excel (.xlsx, .xls)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// --- POST /import/preview --- Загрузка файла, возврат листов + предпросмотр

router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Файл не загружен' });
    }

    const sheets = getSheetNames(req.file.buffer);
    const sheetName = req.body.sheet || sheets[0];

    const { mapping, rows } = parseSheet(req.file.buffer, sheetName);

    res.json({
      success: true,
      data: {
        sheets,
        selectedSheet: sheetName,
        mapping,
        rows,
        totalRows: rows.length,
        fileName: req.file.originalname
      }
    });
  } catch (error) {
    console.error('Import preview error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Файл слишком большой (макс. 10MB)' });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка обработки файла'
    });
  }
});

// --- POST /import/save --- Сохранение импорта в БД

router.post('/save', async (req, res) => {
  try {
    const { rows } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Нет данных для импорта' });
    }

    const results = await saveImport(rows, req.user._id);

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Import save error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка сохранения импорта'
    });
  }
});

module.exports = router;
