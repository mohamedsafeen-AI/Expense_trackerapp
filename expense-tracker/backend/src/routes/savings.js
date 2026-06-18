const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/savingsController');

router.get('/', ctrl.getSavings);

module.exports = router;

