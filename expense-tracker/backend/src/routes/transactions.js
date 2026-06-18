const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/transactionsController');

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.get('/export', ctrl.exportCsv);

module.exports = router;

