const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/analyticsController');

router.get('/', ctrl.analytics);

module.exports = router;

