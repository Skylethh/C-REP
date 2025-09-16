"use client";

import React from 'react';

type Activity = {
  id: string;
  name: string;
  default_unit: string;
  units: string[] | null;
};

export function DailyLogMaterialForm({ activities, action }: { activities: Activity[]; action: (formData: FormData) => void }) {
  const [activityId, setActivityId] = React.useState<string>("");
  const [unit, setUnit] = React.useState<string>("");

  const selected = React.useMemo(() => activities.find((a) => a.id === activityId), [activities, activityId]);
  const unitOptions = React.useMemo(() => {
    if (!selected) return [] as string[];
    const units = Array.isArray(selected.units) ? selected.units : [];
    const merged = [selected.default_unit, ...units];
    // unique, keep order
    return Array.from(new Set(merged.filter(Boolean)));
  }, [selected]);

  React.useEffect(() => {
    // whenever activity changes, reset unit to its default
    if (selected) {
      setUnit(selected.default_unit || (unitOptions[0] ?? ""));
    } else {
      setUnit("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityId]);

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-5 gap-3">
      <select
        name="activity_id"
        className="form-input"
        value={activityId}
        onChange={(e) => setActivityId(e.target.value)}
        required
      >
        <option value="">— Malzeme Seç —</option>
        {activities.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <input type="number" min={0} step="0.01" name="quantity" placeholder="Miktar" className="form-input" required />
      <select
        name="unit"
        className="form-input"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        required
        disabled={!selected}
      >
        {!selected && <option value="">— Birim —</option>}
        {selected &&
          unitOptions.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
      </select>
      <div className="md:col-span-2 flex items-center">
        <button type="submit" className="btn-primary" disabled={!selected || !unit}>
          + Ekle
        </button>
      </div>
    </form>
  );
}
