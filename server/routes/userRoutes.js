const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', userController.register);
router.post('/login', userController.login);
router.get('/profile', authMiddleware, userController.getProfile);
router.post('/deposit', authMiddleware, userController.deposit);
router.post('/withdraw', authMiddleware, userController.withdraw);

module.exports = router;
