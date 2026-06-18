const { supabase } = require('../db/supabaseClient');

async function getMonthlySummaries(req, res, next) {
  try {
    const year = Number(req.query.year);
    const month = String(req.query.month || '').padStart(2, '0');

    if (!year || !month) return res.json({ items: [] });

    const start = `${year}-${month}-01`;
    const end = `${year}-${month}-31`;

    const [inc, exp] = await Promise.all([
      supabase.from('transactions').select('amount').eq('type', 'income').gte('date', start).lte('date', end),
      supabase.from('transactions').select('amount').eq('type', 'expense').gte('date', start).lte('date', end),
    ]);

    const total_income = (inc.data || []).reduce((a, t) => a + Number(t.amount || 0), 0);
    const total_expenses = (exp.data || []).reduce((a, t) => a + Number(t.amount || 0), 0);

    res.json({ items: [{ total_income, total_expenses }] });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMonthlySummaries };

