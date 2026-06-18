const { supabase } = require('../db/supabaseClient');
const {
  transactionCreateSchema,
  transactionUpdateSchema,
} = require('../validators');
const { httpError } = require('../utils/httpErrors');

function parseSort(sort) {
  const s = sort || 'date_desc';
  const map = {
    date_desc: { column: 'date', ascending: false },
    date_asc: { column: 'date', ascending: true },
    amount_desc: { column: 'amount', ascending: false },
    amount_asc: { column: 'amount', ascending: true },
  };
  return map[s] || map.date_desc;
}

async function list(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit || 12), 100);
    const offset = Math.max(Number(req.query.offset || 0), 0);

    const { q, fromDate, toDate, categoryId, type, sort } = req.query;
    const sortDef = parseSort(sort);

    let query = supabase
      .from('transactions')
      .select(
        'id,type,date,amount,currency,description,category_id,category:categories(id,name,type)'
      )
      .order(sortDef.column, { ascending: sortDef.ascending })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('type', type);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (fromDate) query = query.gte('date', fromDate);
    if (toDate) query = query.lte('date', toDate);
    if (q) {
      const like = `%${String(q).slice(0, 100)}%`;
      // Search in transaction description OR joined category name
      query = query.or(`description.ilike.${like},categories.name.ilike.${like}`);
    }

    // Total count

    const countQuery = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true });

    let totalQ = countQuery;
    if (type) totalQ = totalQ.eq('type', type);
    if (categoryId) totalQ = totalQ.eq('category_id', categoryId);
    if (fromDate) totalQ = totalQ.gte('date', fromDate);
    if (toDate) totalQ = totalQ.lte('date', toDate);
    if (q) {
      const like = `%${String(q).slice(0, 100)}%`;
      totalQ = totalQ.or(`description.ilike.${like}`);
    }

    const [{ data, error }, countRes] = await Promise.all([query, totalQ]);
    if (error) throw error;
    const total = countRes?.count || 0;

    const items = (data || []).map((t) => ({
      id: t.id,
      type: t.type,
      date: t.date,
      amount: Number(t.amount),
      currency: t.currency,
      description: t.description,
      category_id: t.category_id,
      category_name: t.category?.name || null,
    }));

    res.json({ items, total });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const parsed = transactionCreateSchema.parse(req.body);

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        type: parsed.type,
        date: parsed.date,
        category_id: parsed.category_id,
        amount: parsed.amount,
        currency: parsed.currency,
        description: parsed.description,
      })
      .select(
        'id,type,date,amount,currency,description,category_id,category:categories(id,name)'
      )
      .single();

    if (error) throw error;

    res.status(201).json({
      item: {
        ...data,
        amount: Number(data.amount),
        category_name: data.category?.name || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const id = req.params.id;
    const parsed = transactionUpdateSchema.parse(req.body);

    const { data, error } = await supabase
      .from('transactions')
      .update({
        date: parsed.date,
        category_id: parsed.category_id,
        amount: parsed.amount,
        currency: parsed.currency,
        description: parsed.description,
      })
      .eq('id', id)
      .select('id,type,date,amount,currency,description,category_id,category:categories(id,name)')
      .single();

    if (error) throw error;
    if (!data) throw httpError(404, 'Transaction not found');

    res.json({
      item: {
        ...data,
        amount: Number(data.amount),
        category_name: data.category?.name || null,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

async function exportCsv(req, res, next) {
  try {
    const limit = 1000;
    const offset = 0;

    const { q, fromDate, toDate, categoryId, type, sort } = req.query;

    const sortDef = parseSort(sort);

    let query = supabase
      .from('transactions')
      .select('id,type,date,amount,currency,description,category_id,category:categories(id,name)')
      .order(sortDef.column, { ascending: sortDef.ascending })
      .range(offset, offset + limit - 1);

    if (type) query = query.eq('type', type);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (fromDate) query = query.gte('date', fromDate);
    if (toDate) query = query.lte('date', toDate);
    if (q) {
      const like = `%${String(q).slice(0, 100)}%`;
      query = query.or(`description.ilike.${like}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = data || [];
    const headers = ['Date', 'Type', 'Category', 'Description', 'Amount', 'Currency'];

    const escape = (v) => {
      const s = String(v ?? '');
      if (/[\n\r,\"]/g.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const lines = [headers.join(',')];
    for (const t of items) {
      lines.push(
        [
          escape(t.date),
          escape(t.type),
          escape(t.category?.name || ''),
          escape(t.description || ''),
          escape(t.amount),
          escape(t.currency),
        ].join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="expense-tracker-transactions.csv"');
    res.status(200).send(lines.join('\n'));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, exportCsv };

