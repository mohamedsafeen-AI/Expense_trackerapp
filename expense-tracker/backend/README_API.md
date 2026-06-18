# Expense Tracker API (No Auth)

Base URL: `/api`

All endpoints are public (no authentication). Data is read/written using the Supabase Service Role key.

## Health
- `GET /api/health`
  - Response: `{ ok: true }`

## Transactions
- `GET /api/transactions`
  - Query params:
    - `limit` (default 12, max 100)
    - `offset` (default 0)
    - `q` (search)
    - `fromDate` (YYYY-MM-DD)
    - `toDate` (YYYY-MM-DD)
    - `categoryId` (uuid)
    - `type` (`income` | `expense`)
    - `sort` (`date_desc`, `date_asc`, `amount_desc`, `amount_asc`)
  - Response: `{ items: [...], total: number }`

- `POST /api/transactions`
  - Body:
    - `type`: `income` | `expense`
    - `date`: `YYYY-MM-DD`
    - `category_id`: uuid
    - `amount`: number (> 0)
    - `currency` (optional, default `USD`)
    - `description` (optional)

- `PUT /api/transactions/:id`
  - Body: same fields as create (except `type` is not updated in this implementation)

- `DELETE /api/transactions/:id`
  - Response: `{ ok: true }`

- `GET /api/transactions/export`
  - Query params: same as `GET /api/transactions` (CSV)
  - Response: downloadable CSV

## Categories
- `GET /api/categories`
  - Response: `{ items: [{id,name,type}, ...] }`

- `POST /api/categories`
  - Body: `{ name, type }`
  - Response: `{ item: ... }`

## Budgets
- `GET /api/budgets/current`
  - Query: `categoryId` (optional)
  - Response: `{ items: [{category_id, category_name, budget_amount, spent_amount, utilization_pct, month, ...}] }`

- `GET /api/budgets/current-single`
  - Response: `{ item: { budget_amount, spent_amount, remaining_amount, ... } | null }`

- `POST /api/budgets`
  - Body:
    - `category_id`: uuid
    - `budget_amount`: number (>0)
    - `month`: `YYYY-MM`

## Analytics
- `GET /api/analytics`
  - Response includes:
    - `monthly_expense_trend`
    - `income_vs_expense`
    - `expense_by_category`
    - `budget_utilization`

## Savings
- `GET /api/savings`
  - Response:
    - `savings_rate`, `projected_savings`, `goal_status`

## Monthly Summaries
- `GET /api/monthly-summaries?year=YYYY&month=MM`
  - Response: `{ items: [{ total_income, total_expenses }] }`

