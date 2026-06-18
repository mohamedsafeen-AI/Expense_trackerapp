# Expense Tracker (Full-Stack)

Premium, production-ready Expense Tracker web app.

## Tech Stack
- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js + Express.js (MVC architecture)
- Database: Supabase (PostgreSQL)
- Frontend Hosting: Netlify
- Backend Hosting: Vercel

## Important Notes (No Auth)
This project intentionally contains **no login/signup/authentication**. The dashboard loads directly on first visit.

Supabase is used **only as a database backend**.

## Repository Structure
```
expense-tracker/
  frontend/
  backend/
  deployment-configs/
  .gitignore
  README.md
  TODO.md
```

## Prerequisites
- Node.js 18+
- Supabase project (PostgreSQL enabled)
- Supabase URL + Service Role key (for backend)

## 1) Supabase Setup
1. Create a Supabase project.
2. Run the SQL schema in:
   - `backend/supabase/schema.sql`
3. Update environment variables (see section below).

## 2) Backend Setup
### Environment Variables
Create `expense-tracker/backend/.env` (or use platform env vars):
- See `backend/.env.example`.

### Install & Run
```bash
cd expense-tracker/backend
npm install
npm run dev
```
Backend will run at `http://localhost:3001` by default.

## 3) Frontend Setup
### Environment Variables
Create `expense-tracker/frontend/.env`:
- See `frontend/.env.example`.

### Build/Run
For local development, you can use any static server; Netlify works similarly.
```bash
cd ../frontend
npm install
npm run dev
```
Or build and serve `frontend/dist`:
```bash
npm run build
```

## 4) API Overview
Open `backend/README_API.md` after implementation.

## 5) Deployment
### Netlify (Frontend)
- Build command: `npm run build`
- Publish directory: `dist`

### Vercel (Backend)
- Configure Vercel to run `npm install && npm run start`
- Set environment variables from `backend/.env.example`

## CSV Export
CSV export is generated client-side via backend query and a download helper.

## Real-time Updates
This implementation uses periodic refresh (no auth). If you later want true realtime, you can extend it using Supabase Realtime.

