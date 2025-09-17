/*
  Import user's baseline construction activity library from CSV (Turkish-only).
  CSV headers:
    item_id,category_tr,sub_category_tr,item_name_tr,default_unit,scope,description_tr

  Usage (example):
    npx ts-node scripts/import-baseline-activities.ts c:\\path\\to\\kutuphane-temel.csv

  Notes:
    - Maps to activities table using item_id as key, item_name_tr as name (TR).
    - Scope mapped from 'Scope 1/2/3' to 'scope1/2/3'.
    - Type inferred from category/sub_category (simple rules, can be refined).
    - default_unit normalized (litre->L, metre->m, m³->m3, ton->t, adet->piece, sefer->trip, ton-km->ton_km).
    - Creates emission_factors placeholders if missing (value=0) so category links resolve; recommended to replace later with authoritative factors.
*/

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

function csvParse(text: string) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const [header, ...rows] = lines;
  const headers = header.split(',').map((h) => h.trim());
  return rows.map((line) => {
    // Basic CSV (no embedded commas in fields except quoted); handle quoted commas
    const parts: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { parts.push(cur); cur = ''; continue; }
      cur += ch;
    }
    parts.push(cur);
    const obj: any = {};
    headers.forEach((h, i) => obj[h] = (parts[i] || '').trim());
    return obj as {
      item_id: string; category_tr: string; sub_category_tr: string; item_name_tr: string;
      default_unit: string; scope: string; description_tr: string;
    };
  });
}

function normUnit(u: string) {
  const x = u.trim().toLowerCase();
  if (x === 'litre' || x === 'lt' || x === 'l') return 'L';
  if (x === 'm³' || x === 'm3') return 'm3';
  if (x === 'm²' || x === 'm2') return 'm2';
  if (x === 'metre' || x === 'm') return 'm';
  if (x === 'kg') return 'kg';
  if (x === 'ton' || x === 't') return 't';
  if (x === 'adet' || x === 'pcs' || x === 'piece') return 'piece';
  if (x === 'sefer' || x === 'trip') return 'trip';
  if (x === 'ton-km' || x === 'tonkm' || x === 'ton_km') return 'ton_km';
  return u; // fallback
}

function normScope(s: string) {
  const t = s.trim().toLowerCase();
  if (t.includes('scope 1')) return 'scope1';
  if (t.includes('scope 2')) return 'scope2';
  if (t.includes('scope 3')) return 'scope3';
  return '';
}

function inferType(category: string, sub: string) {
  const c = category.toLowerCase();
  const s = sub.toLowerCase();
  if (c.includes('operasyon') || c.includes('enerji') || s.includes('enerji')) return 'energy';
  if (s.includes('yakıt')) return 'energy';
  if (s.includes('nakliye')) return 'transport';
  if (c.includes('lojistik')) return 'transport';
  if (c.includes('atık')) return 'other';
  return 'materials';
}

async function main() {
  const file = process.argv[2] || path.join(process.cwd(), 'kutuphane-temel.csv');
  const csv = fs.readFileSync(file, 'utf8');
  const rows = csvParse(csv);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env not set');
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  let up = 0;
  for (const r of rows) {
    if (!r.item_id || !r.item_name_tr) continue;
    const key = r.item_id.toLowerCase().replace(/[^a-z0-9_\-]/g, '_');
    const name = r.item_name_tr.trim();
    const scope = normScope(r.scope);
    const type = inferType(r.category_tr || '', r.sub_category_tr || '');
    const unit = normUnit(r.default_unit || '');

    // upsert activity
    const { data: act, error: aErr } = await supabase.from('activities').upsert({
      key,
      name,
      type,
      scope: scope || null,
      category: key, // category = key for direct mapping to factor category
      default_unit: unit || 'kg',
      units: [unit || 'kg'],
    }, { onConflict: 'key' }).select('id').maybeSingle();
    if (aErr) throw aErr;

    // ensure factor placeholder exists (value 0) to keep mapping consistent
    const { data: f } = await supabase
      .from('emission_factors')
      .select('id')
      .eq('category', key)
      .eq('region', 'global')
      .maybeSingle();
    if (!f) {
      const { data: nf, error: fErr } = await supabase.from('emission_factors').insert({
        category: key,
        scope: scope || 'scope3',
        region: 'global',
        unit_in: unit || 'kg',
        unit_out: 'kg',
        value: 0,
        source: 'baseline-import',
        version: '2025',
        valid_from: new Date().toISOString().slice(0,10)
      }).select('id').maybeSingle();
      if (fErr) throw fErr;
      // map
      await supabase.from('activity_factors').upsert({ activity_id: act?.id, factor_id: nf?.id });
    } else {
      await supabase.from('activity_factors').upsert({ activity_id: act?.id, factor_id: f.id });
    }

    up++;
  }
  console.log(`Upserted ${up} baseline activities`);
}

main().catch((e) => { console.error(e); process.exit(1); });
