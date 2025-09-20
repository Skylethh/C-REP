export function generateReportTitle(projectName: string, dateRange: { from?: Date | string; to?: Date | string }) {
  const name = projectName?.trim() || 'Proje';
  const parse = (d?: Date | string) => (typeof d === 'string' ? new Date(d) : d);
  const from = parse(dateRange.from);
  const to = parse(dateRange.to);

  if (!from && !to) return `${name} Karbon Raporu`;
  if (from && to) {
    const s = new Date(from);
    const e = new Date(to);
    const sameMonth = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth();
    const trMonths = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    if (sameMonth) return `${name} - ${trMonths[e.getMonth()]} ${e.getFullYear()} Karbon Raporu`;
    const pad = (n: number) => String(n).padStart(2, '0');
    const sStr = `${s.getFullYear()}-${pad(s.getMonth()+1)}-${pad(s.getDate())}`;
    const eStr = `${e.getFullYear()}-${pad(e.getMonth()+1)}-${pad(e.getDate())}`;
    return `${name} - ${sStr} → ${eStr} Karbon Raporu`;
  }
  const only = new Date(from || to!);
  const pad = (n: number) => String(n).padStart(2, '0');
  const oStr = `${only.getFullYear()}-${pad(only.getMonth()+1)}-${pad(only.getDate())}`;
  return `${name} - ${oStr} Karbon Raporu`;
}
