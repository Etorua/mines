const router = require('express').Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const adminController = require('../controllers/adminController');

router.get('/users', authMiddleware, adminMiddleware, adminController.getAllUsers);
router.get('/stats', authMiddleware, adminMiddleware, adminController.getStats);
router.post('/withdraw', authMiddleware, adminMiddleware, adminController.withdrawCasinoFunds);
router.put('/users/:id/balance', authMiddleware, adminMiddleware, adminController.updateUserBalance);

module.exports = router;
