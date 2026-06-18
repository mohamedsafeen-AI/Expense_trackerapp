const { supabase } = require('../db/supabaseClient');
const { categoryCreateSchema } = require('../validators');


async function list(req, res, next) {
  try {
    const search = (req.query.search || '').toString().trim();

    let query = supabase
      .from('categories')
      .select('id,name,type')
      .order('name', { ascending: true });

    if (search) {
      const like = `%${search.slice(0, 100)}%`;
      query = query.ilike('name', like);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ items: data || [] });
  } catch (err) {
    next(err);
  }
}


async function create(req, res, next) {
  try {
    const parsed = categoryCreateSchema.parse(req.body);
    const { data, error } = await supabase
      .from('categories')
      .insert({ name: parsed.name, type: parsed.type })
      .select('id,name,type')
      .single();
    if (error) throw error;
    res.status(201).json({ item: data });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create };

