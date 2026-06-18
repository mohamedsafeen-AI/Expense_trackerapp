require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const { errorHandler, notFound } = require('./middlewares/error');
const { env } = require('./utils/env');

const transactionsRouter = require('./routes/transactions');
const categoriesRouter = require('./routes/categories');
const budgetsRouter = require('./routes/budgets');
const analyticsRouter = require('./routes/analytics');
const savingsRouter = require('./routes/savings');
const monthlySummariesRouter = require('./routes/monthlySummaries');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: false,
  })
);

app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/categories', require('./routes/categoriesResolve'));


app.use('/api/budgets', budgetsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/savings', savingsRouter);
app.use('/api/monthly-summaries', monthlySummariesRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Expense Tracker API listening on port ${env.PORT}`);
});

