import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

export type ReportKpis = {
  totalEmissions: number;
  topSource?: string | null;
  entryCount: number;
  summary?: string;
  anomalyCount?: number;
};

export type ReportProps = {
  projectName: string;
  dateStart: string; // ISO yyyy-mm-dd
  dateEnd: string; // ISO yyyy-mm-dd
  generatedAt?: string; // ISO date-time
  reportTitle?: string; // Cover title
  logoUrl?: string; // Optional logo URL
  kpis?: ReportKpis;
  entries?: Array<{
    date: string;
    activityName: string;
    category: string;
    amount: number | null;
    unit: string;
    co2e_value: number;
  }>;
  charts?: {
    byScope?: Record<string, number>;
    byCategory?: Record<string, number>;
  };
  // For future: entries, charts data, logo url, etc.
};

// Register a font that fully supports Turkish characters (ş, ı, ö, ü, ç, Ğ, etc.)
// Using DejaVu Sans via a stable CDN. If you prefer local hosting, place the TTFs under /public/fonts and update src paths.
// Using default built-in PDF font to ensure stable rendering without external files

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 12 },
  title: { fontSize: 24, marginBottom: 12, fontWeight: 'bold' },
  h2: { fontSize: 16, marginTop: 16, marginBottom: 8 },
  text: { marginBottom: 4 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 10, color: '#555' },
  kpiGrid: { display: 'flex', flexDirection: 'row', marginTop: 8 },
  kpiBox: { flexGrow: 1, borderWidth: 1, borderColor: '#ccc', borderStyle: 'solid', borderRadius: 6, padding: 8, marginRight: 8 },
  tableHeader: { display: 'flex', flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ddd', borderBottomStyle: 'solid', paddingBottom: 6, marginTop: 10 },
  tableRow: { display: 'flex', flexDirection: 'row', paddingTop: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#eee', borderBottomStyle: 'solid' },
  th: { fontSize: 11, fontWeight: 'bold' },
  td: { fontSize: 10 },
  chartSection: { marginTop: 16 },
  legendRow: { display: 'flex', flexDirection: 'row', marginTop: 6, flexWrap: 'wrap' },
  legendItem: { display: 'flex', flexDirection: 'row', alignItems: 'center', marginRight: 10, marginBottom: 4 },
  colorSwatch: { width: 10, height: 10, borderRadius: 2 },
  stackedBar: { display: 'flex', flexDirection: 'row', height: 12, borderRadius: 6, borderWidth: 1, borderStyle: 'solid', borderColor: '#ddd' },
  catBarRow: { display: 'flex', flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  catLabel: { width: '35%', fontSize: 10 },
  catBarTrack: { flexGrow: 1, height: 10, borderRadius: 6, backgroundColor: '#eee' },
  catBarFill: { height: 10, borderRadius: 6, backgroundColor: '#16A34A' },
  // Watermark styles
  watermark: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.06,
  },
  watermarkImg: {
    width: 400,
    height: 400,
  },
});

export function ReportDocument({ projectName, dateStart, dateEnd, generatedAt, reportTitle, logoUrl, kpis, entries = [], charts }: ReportProps) {
  const created = generatedAt || new Date().toISOString();
  const fmtDate = (s: string) => {
    try { return new Date(s).toLocaleDateString('tr-TR'); } catch { return s; }
  };
  const formatNumber = (n: number, digits = 2) => {
    if (!Number.isFinite(n)) return '-';
    return n.toLocaleString('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };
  const formatTons = (kg: number, digits = 2) => formatNumber((kg || 0) / 1000, digits);
  // Group entries by category for readability
  const groups = entries.reduce<Record<string, typeof entries>>((acc, e) => {
    const key = e.category || 'Diğer';
    (acc[key] ||= []).push(e);
    return acc;
  }, {});
  const groupKeys = Object.keys(groups).sort();
  const scopePairs = Object.entries(charts?.byScope || {});
  const scopeTotal = scopePairs.reduce((s, [, v]) => s + (Number(v) || 0), 0) || 1;
  const scopePalette: Record<string, string> = { scope1: '#16A34A', scope2: '#0EA5A1', scope3: '#64748B' };
  const scopeLabel = (k: string) => (k === 'scope1' ? 'Scope 1' : k === 'scope2' ? 'Scope 2' : k === 'scope3' ? 'Scope 3' : k);
  const catPairs = Object.entries(charts?.byCategory || {}).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 5);
  const catMax = catPairs.reduce((m, [, v]) => Math.max(m, Number(v) || 0), 0) || 1;
  return (
    <Document>
      {/* Page 1: Cover */}
      <Page size="A4" style={styles.page}>
        {/* Background watermark logo */}
        {logoUrl && (
          <View style={styles.watermark} fixed>
            <Image src={logoUrl} style={styles.watermarkImg} />
          </View>
        )}
        {logoUrl && (
          <View style={{ alignItems: 'center', marginBottom: 12 }}>
            <Image src={logoUrl} style={{ width: 120 }} />
          </View>
        )}
        <Text style={styles.title}>{reportTitle || 'Karbon Ayak İzi Raporu'}</Text>
        <View>
          <Text style={styles.text}>Proje Adı: {projectName}</Text>
          <Text style={styles.text}>Rapor Tarih Aralığı: {fmtDate(dateStart)} — {fmtDate(dateEnd)}</Text>
          <Text style={styles.text}>Oluşturulma Tarihi: {fmtDate(created)}</Text>
        </View>
        <View style={styles.footer} fixed>
          <Text render={({ pageNumber, totalPages }) => `Bu rapor KarbonRapor tarafından oluşturulmuştur.  •  Sayfa ${pageNumber}/${totalPages}`} />
        </View>
      </Page>

      {/* Page 2: Executive Summary (placeholder) */}
      <Page size="A4" style={styles.page}>
        {/* Background watermark logo */}
        {logoUrl && (
          <View style={styles.watermark} fixed>
            <Image src={logoUrl} style={styles.watermarkImg} />
          </View>
        )}
        <Text style={styles.h2}>Yönetici Özeti</Text>
        <View style={styles.kpiGrid}>
          <View style={styles.kpiBox}>
            <Text>Toplam Emisyon (tCO2e)</Text>
            <Text style={{ fontSize: 18 }}>{typeof kpis?.totalEmissions === 'number' ? formatTons(kpis.totalEmissions, 2) : '—'}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text>En Yüksek Emisyon Kaynağı</Text>
            <Text style={{ fontSize: 18 }}>{kpis?.topSource ?? '—'}</Text>
          </View>
          <View style={styles.kpiBox}>
            <Text>Toplam Kayıt Sayısı</Text>
            <Text style={{ fontSize: 18 }}>{kpis?.entryCount ?? '—'}</Text>
          </View>
        </View>
        {/* Smart summary */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 13, marginBottom: 6 }}>Akıllı Özet</Text>
          <Text style={{ color: '#444' }}>{kpis?.summary || 'Seçilen aralık için özet üretilemedi.'}</Text>
          {typeof kpis?.anomalyCount === 'number' && kpis.anomalyCount > 0 && (
            <Text style={{ marginTop: 6, color: '#B45309' }}>Uyarı: Verilerde {kpis.anomalyCount} olası aykırı değer tespit edildi.</Text>
          )}
        </View>
        {/* Simple charts: Scope stacked bar and Top Categories bars */}
        {(scopePairs.length > 0 || catPairs.length > 0) && (
          <View style={styles.chartSection}>
            {scopePairs.length > 0 && (
              <View>
                <Text style={{ fontSize: 13, marginBottom: 6 }}>Kapsam Dağılımı</Text>
                <View style={styles.stackedBar}>
                  {scopePairs.map(([k, v], i) => (
                    <View key={k} style={{ flexGrow: Number(v) || 0, backgroundColor: scopePalette[k] || ['#16A34A','#0EA5A1','#64748B','#A78BFA'][i % 4] }} />
                  ))}
                </View>
                <View style={[styles.legendRow] }>
                  {scopePairs.map(([k, v], i) => (
                    <View key={`legend-${k}`} style={styles.legendItem}>
                      <View style={[styles.colorSwatch, { backgroundColor: scopePalette[k] || ['#16A34A','#0EA5A1','#64748B','#A78BFA'][i % 4] }]} />
                      <Text style={{ fontSize: 11, color: '#333' }}>{scopeLabel(k)} ({(((Number(v)||0)/scopeTotal)*100).toFixed(1)}%)</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {catPairs.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 13, marginBottom: 4 }}>En Yüksek 5 Kategori</Text>
                {catPairs.map(([k, v], i) => (
                  <View key={`cat-${k}`} style={styles.catBarRow}>
                    <Text style={styles.catLabel}>{k}</Text>
                    <View style={styles.catBarTrack}>
                      <View style={[styles.catBarFill, { width: `${Math.max(3, Math.round(((Number(v)||0)/catMax)*100))}%`, backgroundColor: ['#16A34A','#0EA5A1','#64748B','#A78BFA','#F59E0B'][i % 5] }]} />
                    </View>
                    <Text style={{ width: '15%', textAlign: 'right', fontSize: 10 }}>{formatTons(Number(v)||0, 2)} t</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        <View style={styles.footer} fixed>
          <Text render={({ pageNumber, totalPages }) => `Bu rapor KarbonRapor tarafından oluşturulmuştur.  •  Sayfa ${pageNumber}/${totalPages}`} />
        </View>
      </Page>

      {/* Pages 3+: Detailed Tables (grouped by category) */}
      {groupKeys.length > 0 && groupKeys.map((cat, idx) => (
        <Page key={cat} size="A4" style={styles.page} wrap>
          {/* Background watermark logo */}
          {logoUrl && (
            <View style={styles.watermark} fixed>
              <Image src={logoUrl} style={styles.watermarkImg} />
            </View>
          )}
          <Text style={styles.h2}>Emisyon Kayıt Detayları {groupKeys.length > 1 ? `- ${cat}` : ''}</Text>
          {/* Repeating header */}
          <View style={styles.tableHeader} fixed>
            <View style={{ width: '17%' }}><Text style={styles.th}>Tarih</Text></View>
            <View style={{ width: '29%' }}><Text style={styles.th}>Aktivite/Malzeme</Text></View>
            <View style={{ width: '18%' }}><Text style={styles.th}>Kategori</Text></View>
            <View style={{ width: '16%', textAlign: 'right' }}><Text style={styles.th}>Miktar</Text></View>
            <View style={{ width: '10%', textAlign: 'right' }}><Text style={styles.th}>Birim</Text></View>
            <View style={{ width: '10%', textAlign: 'right' }}><Text style={styles.th}>tCO2e</Text></View>
          </View>
          {/* Spacer under fixed header to avoid overlap */}
          <View style={{ height: 22 }} />
          {groups[cat].map((e, i) => (
            <View style={[styles.tableRow, { backgroundColor: i % 2 === 1 ? '#FAFAFA' : 'transparent' }]} key={`${cat}-${i}`}>
              <View style={{ width: '17%' }}><Text style={styles.td}>{fmtDate(e.date)}</Text></View>
              <View style={{ width: '29%' }}><Text style={styles.td}>{e.activityName}</Text></View>
              <View style={{ width: '18%' }}><Text style={styles.td}>{e.category}</Text></View>
              <View style={{ width: '16%', textAlign: 'right' }}><Text style={styles.td}>{e.amount == null ? '-' : (Number(e.amount)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</Text></View>
              <View style={{ width: '10%', textAlign: 'right' }}><Text style={styles.td}>{e.unit}</Text></View>
              <View style={{ width: '10%', textAlign: 'right' }}><Text style={styles.td}>{formatNumber(e.co2e_value/1000, 3)}</Text></View>
            </View>
          ))}
          <View style={styles.footer} fixed>
            <Text render={({ pageNumber, totalPages }) => `Bu rapor KarbonRapor tarafından oluşturulmuştur.  •  Sayfa ${pageNumber}/${totalPages}`} />
          </View>
        </Page>
      ))}

      {/* Final Page: Methodology (placeholder) */}
      <Page size="A4" style={styles.page}>
        {/* Background watermark logo */}
        {logoUrl && (
          <View style={styles.watermark} fixed>
            <Image src={logoUrl} style={styles.watermarkImg} />
          </View>
        )}
        <Text style={styles.h2}>Metodoloji ve Tanımlar</Text>
        <Text style={styles.text}>Scope 1: Kuruluşa ait veya kontrolü altındaki doğrudan emisyonlar.</Text>
        <Text style={styles.text}>Scope 2: Satın alınan elektrik, ısı veya buhardan kaynaklanan dolaylı emisyonlar.</Text>
        <Text style={styles.text}>Scope 3: Tedarik zinciri gibi diğer dolaylı emisyonlar.</Text>
        <Text style={{ marginTop: 8 }}>Hesaplamalar, GHG Protokolü ve geçerli emisyon faktörü veritabanları baz alınarak yapılmıştır.</Text>
        <View style={styles.footer} fixed>
          <Text render={({ pageNumber, totalPages }) => `Bu rapor KarbonRapor tarafından oluşturulmuştur.  •  Sayfa ${pageNumber}/${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export default ReportDocument;
