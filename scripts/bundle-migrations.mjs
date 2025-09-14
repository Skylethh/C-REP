import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'db', 'migrations');
const files = readdirSync(dir)
  .filter((f) => /\d+_.*\.sql$/.test(f))
  .sort((a, b) => a.localeCompare(b));
const out = files.map((f) => `-- ${f}\n${readFileSync(join(dir, f), 'utf8')}`).join('\n\n');
const outPath = join(process.cwd(), 'db', 'bundle.sql');
writeFileSync(outPath, out);
console.log('Bundled to', outPath);


