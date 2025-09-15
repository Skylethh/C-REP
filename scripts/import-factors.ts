/*
  Usage:
    1) Place a CSV at data/factors.csv with headers:
       category,scope,region,unit_in,unit_out,value,source,version,valid_from
    2) Run: npx ts-node scripts/import-factors.ts

  This script upserts emission_factors and creates activities (optional) when missing.
*/

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env from .env.local first, then fallback to .env
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

type Row = {
  category: string;
  scope: string;
  region: string;
  unit_in: string;
  unit_out: string;
  value: string;
  source?: string;
  version?: string;
  valid_from?: string;
};

function parseCSV(text: string): Row[] {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',');
  return lines.map((line) => {
    const cols = line.split(',');
    const obj: any = {};
    headers.forEach((h, i) => (obj[h.trim()] = (cols[i] || '').trim()));
    return obj as Row;
  });
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase env not set. Expected NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local');
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const file = path.join(process.cwd(), 'data', 'factors.csv');
  const text = fs.readFileSync(file, 'utf8');
  const rows = parseCSV(text);

  const isoDate = (d?: string) => {
    if (!d) return new Date().toISOString().slice(0, 10);
    // Accept YYYY-MM-DD only; otherwise fallback
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date().toISOString().slice(0, 10);
  };

  let inserted = 0;
  for (const r of rows) {
    // Skip header rows accidentally present in the body
    if (!r.category || r.category.toLowerCase() === 'category') continue;
    if (r.valid_from && r.valid_from.toLowerCase() === 'valid_from') continue;
    if (!r.unit_in || !r.unit_out || !r.value) continue;
    // Upsert factor
    const { error: fErr } = await supabase.from('emission_factors').upsert({
      category: r.category,
      scope: r.scope || null,
      region: r.region || 'global',
      unit_in: r.unit_in,
      unit_out: r.unit_out || 'kg',
      value: Number(r.value),
      source: r.source || 'import',
      version: r.version || 'import',
      valid_from: isoDate(r.valid_from)
    }, { onConflict: 'category,region,valid_from' });
    if (fErr) throw fErr;

    // Ensure activity exists and map (optional): create by category if missing
    const { data: act } = await supabase.from('activities').select('id').eq('key', r.category).maybeSingle();
    let activityId = act?.id;
    if (!activityId) {
      const { data: created, error: aErr } = await supabase.from('activities').insert({
        key: r.category,
        name: r.category.replace(/_/g, ' '),
        type: 'materials',
        scope: r.scope || 'scope3',
        category: r.category,
        default_unit: r.unit_in,
        units: [r.unit_in]
      }).select('id').maybeSingle();
      if (aErr) throw aErr;
      activityId = created?.id;
    }
    // Map latest factor of same category
    const { data: factor } = await supabase
      .from('emission_factors')
      .select('id')
      .eq('category', r.category)
      .eq('region', r.region || 'global')
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activityId && factor?.id) {
      await supabase.from('activity_factors').upsert({ activity_id: activityId, factor_id: factor.id });
    }
    inserted++;
  }
  console.log(`Imported ${inserted} factors/activities`);
}

main().catch((e) => { console.error(e); process.exit(1); });


