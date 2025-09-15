export type EmissionFactor = {
  category: string;
  region: string;
  unit_in: string;
  unit_out: string;
  value: number;
  valid_from: string; // YYYY-MM-DD
};

/**
 * Pick the best factor given optional activity-specific factors and category factors.
 * Preference order:
 * 1) activityFactors filtered by region, valid_from <= date, latest by valid_from
 * 2) categoryFactors filtered by region, valid_from <= date, latest by valid_from
 * Returns null if none.
 */
export function pickFactor(
  activityFactors: EmissionFactor[] | null,
  categoryFactors: EmissionFactor[] | null,
  date: string | null,
  region: string = 'global'
): EmissionFactor | null {
  const targetDate = date || '9999-12-31';
  const select = (arr: EmissionFactor[] | null) => {
    if (!arr || arr.length === 0) return null;
    return arr
      .filter((f) => (f.region || 'global') === region)
      .filter((f) => (f.valid_from || '0001-01-01') <= targetDate)
      .sort((a, b) => (a.valid_from < b.valid_from ? 1 : -1))[0] || null;
  };
  return select(activityFactors) || select(categoryFactors) || null;
}


