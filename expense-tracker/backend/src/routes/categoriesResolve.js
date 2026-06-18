const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/categoriesResolveController');

router.get('/suggest', ctrl.suggestCategories);
router.post('/resolve', ctrl.resolveCategory);


module.exports = router;

