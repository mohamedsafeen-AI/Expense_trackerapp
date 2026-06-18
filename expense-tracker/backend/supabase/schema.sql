-- Expense Tracker Supabase Schema (No Auth)
-- Run in your Supabase SQL editor.

create extension if not exists pgcrypto;

-- Categories: both income and expense categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('income','expense')),
  created_at timestamptz not null default now(),
  unique (type, name)
);

-- Transactions: income/expense rows
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('income','expense')),
  date date not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'USD',
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_transactions_type_date on public.transactions(type, date);
create index if not exists idx_transactions_category_date on public.transactions(category_id, date);
create index if not exists idx_transactions_date on public.transactions(date);

-- Budgets: monthly budget per category (expense categories)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  month text not null check (month ~ '^\\d{4}-\\d{2}$'),
  budget_amount numeric(14,2) not null check (budget_amount > 0),
  created_at timestamptz not null default now(),
  unique (category_id, month)
);

create index if not exists idx_budgets_month on public.budgets(month);
create index if not exists idx_budgets_category on public.budgets(category_id);

-- Monthly summaries: computed/optional storage
create table if not exists public.monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  month text not null check (month ~ '^\\d{2}$' ),
  total_income numeric(14,2) not null default 0,
  total_expenses numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  unique (year, month)
);

create index if not exists idx_monthly_summaries_year_month on public.monthly_summaries(year, month);

-- Seed data (optional). Safe to run repeatedly.
insert into public.categories (name, type)
values
  ('Salary', 'income'),
  ('Freelance', 'income'),
  ('Groceries', 'expense'),
  ('Rent', 'expense'),
  ('Transport', 'expense'),
  ('Utilities', 'expense'),
  ('Dining', 'expense')
ON CONFLICT (type, name) do nothing;

-- Note: Transactions/budgets are not seeded to avoid assumptions.
-- You can insert sample rows after deploying.

-- RLS configuration:
-- For production you should enable Row Level Security and restrict by auth.
-- This project uses no authentication, so we keep RLS disabled for public access.
alter table public.categories disable row level security;
alter table public.transactions disable row level security;
alter table public.budgets disable row level security;
alter table public.monthly_summaries disable row level security;

