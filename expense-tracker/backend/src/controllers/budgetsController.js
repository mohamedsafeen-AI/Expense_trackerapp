const { supabase } = require('../db/supabaseClient');
const { budgetUpsertSchema } = require('../validators');

function monthStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function current(req, res, next) {
  try {
    const nowMonth = monthStr();
    const { categoryId } = req.query;

    let q = supabase
      .from('budgets')
      .select(
        'id,category_id,budget_amount,month,category:categories(name,type)'
      )
      .eq('month', nowMonth);

    if (categoryId) q = q.eq('category_id', categoryId);

    q = q.order('budget_amount', { ascending: false });

    const { data, error } = await q;
    if (error) throw error;

    // join spent for utilization
    const tx = await supabase
      .from('transactions')
      .select('category_id,type,amount,date')
      .gte('date', `${nowMonth}-01`)
      .lte('date', `${nowMonth}-31`);

    const txItems = tx.data || [];

    const byCatSpent = {};
    for (const t of txItems) {
      if (t.type !== 'expense') continue;
      byCatSpent[t.category_id] = (byCatSpent[t.category_id] || 0) + Number(t.amount || 0);
    }

    const items = (data || []).map((b) => {
      const spent = byCatSpent[b.category_id] || 0;
      const pct = b.budget_amount > 0 ? (spent / b.budget_amount) * 100 : 0;
      const period_label = nowMonth;
      return {
        id: b.id,
        category_id: b.category_id,
        category_name: b.category?.name || null,
        budget_amount: Number(b.budget_amount),
        spent_amount: spent,
        utilization_pct: pct,
        month: b.month,
        period_label,
      };
    });

    res.json({ items });
  } catch (err) {
    next(err);
  }
}

async function currentSingle(req, res, next) {
  try {
    const nowMonth = monthStr();

    // For UI simplicity: pick top budget by amount
    const { data, error } = await supabase
      .from('budgets')
      .select('id,category_id,budget_amount,month,category:categories(name,type)')
      .eq('month', nowMonth)
      .order('budget_amount', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) return res.json({ item: null });

    const { data: txData, error: txErr } = await supabase
      .from('transactions')
      .select('amount')
      .eq('category_id', data.category_id)
      .eq('type', 'expense')
      .gte('date', `${nowMonth}-01`)
      .lte('date', `${nowMonth}-31`);

    if (txErr) throw txErr;

    const spent = (txData || []).reduce((a, t) => a + Number(t.amount || 0), 0);
    const remaining = Math.max(0, Number(data.budget_amount) - spent);
    res.json({
      item: {
        id: data.id,
        category_id: data.category_id,
        category_name: data.category?.name || null,
        budget_amount: Number(data.budget_amount),
        spent_amount: spent,
        remaining_amount: remaining,
        period_label: data.month,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function upsert(req, res, next) {
  try {
    const parsed = budgetUpsertSchema.parse(req.body);

    // unique by (category_id, month)
    const { data, error } = await supabase
      .from('budgets')
      .upsert(
        {
          category_id: parsed.category_id,
          budget_amount: parsed.budget_amount,
          month: parsed.month,
        },
        { onConflict: 'category_id,month' }
      )
      .select('id,category_id,budget_amount,month,category:categories(name)');

    if (error) throw error;

    res.status(201).json({ item: (data || [])[0] || null });
  } catch (err) {
    next(err);
  }
}

module.exports = { current, currentSingle, upsert };

