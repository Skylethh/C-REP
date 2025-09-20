export function generateReportTitle(projectName: string, dateRange: { from?: Date | string; to?: Date | string }) {
  const name = projectName?.trim() || 'Proje';
  const toValidDate = (d?: Date | string): Date | undefined => {
    if (!d) return undefined;
    const v = typeof d === 'string' ? new Date(d) : d;
    if (!(v instanceof Date) || Number.isNaN(v.getTime())) return undefined;
    return v;
  };

  const from = toValidDate(dateRange.from);
  const to = toValidDate(dateRange.to);

  // No valid dates
  if (!from && !to) return `${name} Karbon Raporu`;

  const pad = (n: number) => String(n).padStart(2, '0');
  const trMonths = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

  // Both valid
  if (from && to) {
    const s = new Date(from);
    const e = new Date(to);
    const sameMonth = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
    if (sameMonth) return `${name} - ${trMonths[e.getMonth()]} ${e.getFullYear()} Karbon Raporu`;
    const sStr = `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}`;
    const eStr = `${e.getFullYear()}-${pad(e.getMonth() + 1)}-${pad(e.getDate())}`;
    return `${name} - ${sStr} → ${eStr} Karbon Raporu`;
  }

  // Only one valid
  const only = (from || to)!;
  const oStr = `${only.getFullYear()}-${pad(only.getMonth() + 1)}-${pad(only.getDate())}`;
  return `${name} - ${oStr} Karbon Raporu`;
}
