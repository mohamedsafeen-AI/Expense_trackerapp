const { z } = require('zod');

const uuid = z.string().uuid();

const transactionCreateSchema = z.object({
  type: z.enum(['income', 'expense']),
  date: z.string().min(1),
  category_id: uuid,
  amount: z.number().finite().positive(),
  currency: z.string().min(1).max(10).default('USD'),
  description: z.string().max(500).optional().or(z.literal('')).transform((v) => (v ? v : null)),
});

const transactionUpdateSchema = z.object({
  date: z.string().min(1),
  category_id: uuid,
  amount: z.number().finite().positive(),
  currency: z.string().min(1).max(10).default('USD'),
  description: z.string().max(500).optional().or(z.literal('')).transform((v) => (v ? v : null)),
});

const categoryCreateSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(['income', 'expense']),
});

const categoryResolveSchema = z.object({
  name: z.string().min(1).max(60),
  type: z.enum(['income', 'expense']),
});

const categorySuggestSchema = z.object({
  q: z.string().optional().default(''),
  type: z.enum(['income', 'expense']),
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
});

const budgetUpsertSchema = z.object({
  category_id: uuid,
  budget_amount: z.number().finite().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
});

module.exports = {
  transactionCreateSchema,
  transactionUpdateSchema,
  categoryCreateSchema,
  categoryResolveSchema,
  categorySuggestSchema,
  budgetUpsertSchema,
};


