import BeforeAfter from '@/components/charts/BeforeAfter';

export default function OpportunitiesPlaceholder() {
  // Placeholder values; in future, read from recommendation engine output
  const currentKg = 12500; // current baseline in kg
  const projectedKg = 8600; // after action in kg
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Fırsatlar</h1>
      <p className="text-green-300/80">AI önerileri ile ölçülebilir azalma potansiyelini görün.</p>
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="text-sm text-white/70 mb-2">Önce ve Sonra (tCO2e)</div>
        <BeforeAfter beforeKg={currentKg} afterKg={projectedKg} />
      </div>
    </div>
  );
}


