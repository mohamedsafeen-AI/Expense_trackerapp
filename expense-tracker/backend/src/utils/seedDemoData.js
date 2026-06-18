const { supabase } = require('../db/supabaseClient');

async function seedDemoData() {
  // Optional: seed transactions/budgets only if empty.
  // This is safe because it uses inserts with reasonable constraints.

  // Categories assumed to exist via schema seed.
  const { data: txCountRows } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true });

  // Supabase returns count as a number in count API, but for simplicity:
  // If table empty, insert sample.
  const { count } = txCountRows || {};

  // If count is unavailable, just skip.
  // Real apps should not rely on seeding like this.
  if (typeof count === 'number' && count > 0) return;

  // Insert sample transactions
  await supabase.from('transactions').insert([
    {
      type: 'income',
      date: new Date().toISOString().slice(0, 10),
      category_id: (await getCategoryId('Salary', 'income')),
      amount: 5000,
      currency: 'USD',
      description: 'Monthly salary',
    },
    {
      type: 'expense',
      date: new Date().toISOString().slice(0, 10),
      category_id: (await getCategoryId('Groceries', 'expense')),
      amount: 230.75,
      currency: 'USD',
      description: 'Weekly groceries',
    },
  ]);

  // Insert a sample budget for current month by groceries
  const ym = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  await supabase.from('budgets').upsert(
    {
      category_id: (await getCategoryId('Groceries', 'expense')),
      budget_amount: 500,
      month: ym,
    },
    { onConflict: 'category_id,month' }
  );
}

async function getCategoryId(name, type) {
  const { data, error } = await supabase
    .from('categories')
    .select('id')
    .eq('type', type)
    .ilike('name', name)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) throw new Error(`Missing category for ${type}:${name}`);
  return data.id;
}

module.exports = { seedDemoData };

