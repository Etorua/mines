const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/start', authMiddleware, gameController.startGame);
router.post('/reveal', authMiddleware, gameController.revealCell);
router.post('/cashout', authMiddleware, gameController.cashout);
router.get('/active', authMiddleware, gameController.getActiveGame);

module.exports = router;
