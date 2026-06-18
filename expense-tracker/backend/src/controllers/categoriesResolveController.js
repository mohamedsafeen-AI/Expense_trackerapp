const { supabase } = require('../db/supabaseClient');
const { categoryResolveSchema, categorySuggestSchema } = require('../validators');


function normalizeName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ');
}

async function resolveCategory(req, res, next) {
  try {
    const parsed = categoryResolveSchema.parse(req.body);
    const name = normalizeName(parsed.name);

    // Use case-insensitive uniqueness: unique(type, lower(name)) already exists.
    // Do a find then insert-or-select.
    const { data: existing, error: existingErr } = await supabase
      .from('categories')
      .select('id,name,type')
      .eq('type', parsed.type)
      .ilike('name', name)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (existing) return res.status(200).json({ item: existing });

    const { data: created, error: createErr } = await supabase
      .from('categories')
      .insert({ name, type: parsed.type })
      .select('id,name,type')
      .single();

    // If there is a race and unique constraint triggers, fetch instead.
    if (createErr) {
      const { data: retry, error: retryErr } = await supabase
        .from('categories')
        .select('id,name,type')
        .eq('type', parsed.type)
        .ilike('name', name)
        .maybeSingle();

      if (retryErr) throw retryErr;
      if (!retry) throw createErr;
      return res.status(200).json({ item: retry });
    }

    res.status(201).json({ item: created });
  } catch (err) {
    next(err);
  }
}

async function suggestCategories(req, res, next) {
  try {
    const parsed = categorySuggestSchema.parse(req.query);
    const nameQuery = normalizeName(parsed.q);

    // Suggest by prefix first; fall back to contains.
    const pattern = `%${nameQuery.slice(0, 100)}%`;

    let query = supabase
      .from('categories')
      .select('id,name,type')
      .eq('type', parsed.type)
      .order('name', { ascending: true })
      .limit(parsed.limit);

    if (nameQuery) {
      query = query.ilike('name', `${nameQuery.slice(0, 100)}%`);
    }

    // If the prefix search is too narrow, use contains. Keep it simple: if no results, retry contains.
    const { data: prefixData, error: prefixErr } = await query;
    if (prefixErr) throw prefixErr;
    if (prefixData && prefixData.length > 0) {
      return res.json({
        items: prefixData.map((c) => ({ id: c.id, name: c.name, type: c.type })),
      });
    }

    if (!nameQuery) {
      return res.json({ items: [] });
    }

    const { data: containsData, error: containsErr } = await supabase
      .from('categories')
      .select('id,name,type')
      .eq('type', parsed.type)
      .ilike('name', pattern)
      .order('name', { ascending: true })
      .limit(parsed.limit);

    if (containsErr) throw containsErr;

    return res.json({
      items: (containsData || []).map((c) => ({ id: c.id, name: c.name, type: c.type })),
    });

  } catch (err) {
    next(err);
  }
}

module.exports = { resolveCategory, suggestCategories };

