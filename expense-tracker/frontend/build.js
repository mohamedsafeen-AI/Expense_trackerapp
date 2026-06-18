import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from)) {
    const s = path.join(from, entry);
    const d = path.join(to, entry);
    const stat = fs.statSync(s);
    if (stat.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function replaceEnvPlaceholders() {
  const apiBaseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:3001';
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

  fs.mkdirSync(distDir, { recursive: true });
  const envFile = path.join(distDir, 'env.js');

  fs.writeFileSync(
    envFile,
    [
      `export const API_BASE_URL = ${JSON.stringify(apiBaseUrl)};`,
      `export const SUPABASE_URL = ${JSON.stringify(supabaseUrl)};`,
      `export const SUPABASE_ANON_KEY = ${JSON.stringify(supabaseAnonKey)};`,
      '',
    ].join('\n') + '\n'
  );
}

fs.rmSync(distDir, { recursive: true, force: true });
copyDir(srcDir, distDir);
replaceEnvPlaceholders();
console.log('Built frontend to dist/');

