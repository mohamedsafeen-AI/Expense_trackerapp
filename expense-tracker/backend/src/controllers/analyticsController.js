const { supabase } = require('../db/supabaseClient');

function lastNMonths(n) {
  const out = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    out.push(`${y}-${m}`);
  }
  return out;
}

async function analytics(req, res, next) {
  try {
    const months = lastNMonths(6);

    // Monthly expenses trend
    const monthly_expenses = [];
    for (const ym of months) {
      const start = `${ym}-01`;
      const end = `${ym}-31`;
      const { data } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'expense')
        .gte('date', start)
        .lte('date', end);
      const total = (data || []).reduce((a, t) => a + Number(t.amount || 0), 0);
      monthly_expenses.push({ month: ym, total_expenses: total });
    }

    // Income vs expense
    const income = [];
    const expense = [];
    for (const ym of months) {
      const start = `${ym}-01`;
      const end = `${ym}-31`;
      const [incR, expR] = await Promise.all([
        supabase.from('transactions').select('amount').eq('type', 'income').gte('date', start).lte('date', end),
        supabase.from('transactions').select('amount').eq('type', 'expense').gte('date', start).lte('date', end),
      ]);
      income.push({ label: ym, value: (incR.data || []).reduce((a, t) => a + Number(t.amount || 0), 0) });
      expense.push({ label: ym, value: (expR.data || []).reduce((a, t) => a + Number(t.amount || 0), 0) });
    }

    // Expense category pie (current month)
    const now = new Date();
    const curYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const start = `${curYM}-01`;
    const end = `${curYM}-31`;

    const { data: catRows } = await supabase
      .from('transactions')
      .select('category_id,amount,category:categories(name)')
      .eq('type', 'expense')
      .gte('date', start)
      .lte('date', end);

    const map = {};
    for (const r of catRows || []) {
      const name = r.category?.name || r.category_id;
      map[name] = (map[name] || 0) + Number(r.amount || 0);
    }
    const expense_by_category = Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Budget utilization (current month)
    const { data: budgetRows } = await supabase
      .from('budgets')
      .select('budget_amount,category_id,month,category:categories(name)')
      .eq('month', curYM);

    const { data: txRows } = await supabase
      .from('transactions')
      .select('category_id,amount')
      .eq('type', 'expense')
      .gte('date', start)
      .lte('date', end);

    const spentMap = {};
    for (const t of txRows || []) {
      spentMap[t.category_id] = (spentMap[t.category_id] || 0) + Number(t.amount || 0);
    }

    const budget_utilization = (budgetRows || []).map((b) => {
      const spent = spentMap[b.category_id] || 0;
      const pct = b.budget_amount > 0 ? (spent / b.budget_amount) * 100 : 0;
      return { label: b.category?.name || b.category_id, value: pct, budget: Number(b.budget_amount), spent };
    });

    res.json({
      monthly_expenses: monthly_expenses,
      monthly_expenses_raw: monthly_expenses,
      monthly_expense_trend: monthly_expenses,
      monthly_expense_trend_raw: monthly_expenses,
      income_vs_expense: { income, expense },
      expense_by_category: expense_by_category.map((x) => ({ value: x.value, label: x.name, name: x.name })),
      budget_utilization: budget_utilization.slice(0, 6).map((x) => ({ value: x.value, label: x.label })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { analytics };

