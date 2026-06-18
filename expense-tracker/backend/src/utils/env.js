const required = (name, value) => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT || 3001),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

  SUPABASE_URL: required('SUPABASE_URL', process.env.SUPABASE_URL),
  SUPABASE_SERVICE_ROLE_KEY: required(
    'SUPABASE_SERVICE_ROLE_KEY',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  ),
};


module.exports = { env };

