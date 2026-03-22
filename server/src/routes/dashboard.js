const express = require('express');
const { protect } = require('../middleware/auth');
const {
  getStats,
  getAlerts,
  getByCompany,
  getByType,
  getUpcoming
} = require('../services/dashboardService');

const router = express.Router();

router.use(protect);

// GET /api/v1/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const period = req.query.period || 'all'; // all | month | quarter | year
    const data = await getStats(req.user._id, period);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки статистики' });
  }
});

// GET /api/v1/dashboard/alerts
router.get('/alerts', async (req, res) => {
  try {
    const data = await getAlerts(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Dashboard alerts error:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки тревог' });
  }
});

// GET /api/v1/dashboard/by-company
router.get('/by-company', async (req, res) => {
  try {
    const data = await getByCompany(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Dashboard by-company error:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки аналитики по СК' });
  }
});

// GET /api/v1/dashboard/by-type
router.get('/by-type', async (req, res) => {
  try {
    const data = await getByType(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Dashboard by-type error:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки аналитики по типам' });
  }
});

// GET /api/v1/dashboard/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const data = await getUpcoming(req.user._id);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Dashboard upcoming error:', error);
    res.status(500).json({ success: false, error: 'Ошибка загрузки предстоящих событий' });
  }
});

module.exports = router;
