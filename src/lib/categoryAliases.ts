// Normalize free-text Turkish category names to canonical factor categories/keys

function toAsciiLower(input: string) {
  const map: Record<string, string> = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'I': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
  };
  return (input || '')
    .replace(/[çğıöşüÇĞİIÖŞÜ]/g, (m) => map[m] || m)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function slugifyTR(input: string) {
  const s = toAsciiLower(input.trim());
  return s
    .replace(/\s+|\//g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

const ALIASES: Record<string, string> = {
  // Concrete
  'hazir_beton_c20_25': 'hazir_beton_c20_25',
  'hazir_beton_c25_30': 'hazir_beton_c25_30',
  'hazir_beton_c30_37': 'hazir_beton_c30_37',
  'beton_c20_25': 'hazir_beton_c20_25',
  'beton_c25_30': 'hazir_beton_c25_30',
  'beton_c30_37': 'hazir_beton_c30_37',
  'beton_c20': 'hazir_beton_c20_25',
  'beton_c25': 'hazir_beton_c25_30',
  'beton_c30': 'hazir_beton_c30_37',
  'grobeton': 'grobeton_c16_20',
  'sap_betonu': 'sap_betonu',

  // Walls, finishes
  'alci_siva': 'alci_siva',
  'alci': 'alci_siva',
  'cimento_esasli_siva': 'cimento_esasli_siva',
  'duvar_orgu_harci': 'duvar_orgu_harci',
  'gazbeton': 'gazbeton',
  'bims_blok': 'bims_blok',
  'isi_yalitim_eps': 'isi_yalitim_eps',
  'isi_yalitim_xps': 'isi_yalitim_xps',
  'cam_yunu': 'cam_yunu',
  'duz_cam': 'duz_cam',
  'isicam': 'isicam',
  'ic_cephe_boyasi': 'ic_cephe_boyasi',
  'dis_cephe_boyasi': 'dis_cephe_boyasi',
  'parke': 'parke',

  // Metals, profiles
  'aluminyum_dograma': 'aluminyum_dograma',
  'aluminyum_dograma_profili': 'aluminyum_dograma',
  'aluminyum_dograma_profil': 'aluminyum_dograma',
  'pvc_dograma': 'pvc_dograma',
  'hasir_celik': 'hasir_celik',

  // MEP
  'pprc_boru': 'pprc_boru',
  'hava_kanali_galvaniz': 'hava_kanali_galvaniz',
  'bakir_klima_borusu': 'bakir_klima_borusu',
  'bakir_elektrik_kablosu': 'bakir_elektrik_kablosu',
  'kablo_tavasi': 'kablo_tavasi',
  'asansor': 'asansor',
  'klima_santrali': 'klima_santrali',

  // Site operations / logistics
  'kule_vinc': 'kule_vinc_saat',
  'kule_vinc_saat': 'kule_vinc_saat',
  'malzeme_nakliyesi_km': 'truck_avg_km',
  'malzeme_nakliyesi_ton_km': 'truck_avg_ton_km',
  'nakliye_km': 'truck_avg_km',
  'nakliye_ton_km': 'truck_avg_ton_km',

  // Aggregates / fill
  'dolgu_agrega': 'dolgu_agrega',
  'stabilize': 'dolgu_stabilize',
  'dolgu_stabilize': 'dolgu_stabilize',

  // Waterproofing and membranes
  'bitumlu_membran': 'bitumlu_membran',
  'su_yalitim_surme': 'su_yalitim_surme',

  // Energy / fuel
  'elektrik': 'energy',
  'sebekeelektrik': 'energy',
  'dizel': 'fuel',
  'yakıt_dizel': 'fuel',
};

export function normalizeCategory(input: string | null | undefined): string | null {
  if (!input) return null;
  const slug = slugifyTR(input);
  if (!slug) return null;
  if (ALIASES[slug]) return ALIASES[slug];
  // If already matches our known slugs, keep it
  return slug;
}
