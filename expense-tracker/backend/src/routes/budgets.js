const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/budgetsController');

router.get('/current', ctrl.current);
router.get('/current-single', ctrl.currentSingle);
router.post('/', ctrl.upsert);

module.exports = router;

