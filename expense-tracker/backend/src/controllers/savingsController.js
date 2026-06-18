const { supabase } = require('../db/supabaseClient');

function monthRange(monthStr) {
  return { start: `${monthStr}-01`, end: `${monthStr}-31` };
}

function monthStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function getSavings(req, res, next) {
  try {
    const m = monthStr();
    const { start, end } = monthRange(m);

    const [inc, exp] = await Promise.all([
      supabase.from('transactions').select('amount').eq('type', 'income').gte('date', start).lte('date', end),
      supabase.from('transactions').select('amount').eq('type', 'expense').gte('date', start).lte('date', end),
    ]);

    const income = (inc.data || []).reduce((a, t) => a + Number(t.amount || 0), 0);
    const expenses = (exp.data || []).reduce((a, t) => a + Number(t.amount || 0), 0);
    const savings = income - expenses;

    const savings_rate = income > 0 ? (savings / income) * 100 : 0;
    const projected_savings = savings; // simplistic month projection

    let goal_status = 'On track';
    if (income === 0 && expenses === 0) goal_status = 'Add transactions to start';
    else if (savings_rate < 10) goal_status = 'Consider tightening expenses';
    else if (savings_rate >= 20) goal_status = 'Great savings momentum';

    res.json({
      savings_rate,
      projected_savings,
      goal_status,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSavings };

