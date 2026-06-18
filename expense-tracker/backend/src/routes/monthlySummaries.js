const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/monthlySummariesController');

router.get('/', ctrl.getMonthlySummaries);

module.exports = router;

