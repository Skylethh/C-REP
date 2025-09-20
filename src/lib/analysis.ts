export function findDataAnomalies(values: number[], zThreshold = 3): { index: number; value: number; z: number }[] {
  const xs = values.filter((v) => Number.isFinite(v));
  const n = xs.length;
  if (n === 0) return [];
  const mean = xs.reduce((s, v) => s + v, 0) / n;
  const variance = xs.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
  const std = Math.sqrt(variance);
  if (std === 0) return [];
  const anomalies: { index: number; value: number; z: number }[] = [];
  values.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    const z = (v - mean) / std;
    if (Math.abs(z) > zThreshold) anomalies.push({ index: i, value: v, z });
  });
  return anomalies;
}

export function generateSmartSummary(totalEmissions: number, entryCount: number, byType: Record<string, number>, anomalyCount: number) {
  const totalStr = (totalEmissions / 1000).toFixed(2); // tons
  const totalByType = Object.entries(byType).sort((a, b) => b[1] - a[1]);
  const topPair = totalByType[0];
  const share = topPair ? (topPair[1] / Math.max(totalEmissions, 1)) * 100 : 0;
  const summary = `Seçilen dönemde ${entryCount} kayıt ile toplam ${totalStr} tCO2e emisyon oluştu. ${topPair ? `Emisyonların ${share.toFixed(1)}%’i ${topPair[0]} kaynaklıdır.` : ''} ${anomalyCount > 0 ? `Verilerde ${anomalyCount} olası aykırı değer tespit edildi.` : ''}`.trim();
  return summary;
}

// Optional: Groq-backed short summary
type SummaryInput = {
  projectName?: string;
  totalEmissions: number; // in kg CO2e
  entryCount: number;
  topSource?: { name: string; percentage: number } | null;
  dateStart: string;
  dateEnd: string;
};

export async function generateLLMSummaryGroq(input: SummaryInput, opts?: { timeoutMs?: number }): Promise<string | null> {
  try {
    const enabled = process.env.REPORT_SUMMARY_LLM === 'groq';
    const apiKey = process.env.GROQ_API_KEY;
    if (!enabled || !apiKey) return null;
  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs ?? (Number(process.env.REPORT_SUMMARY_TIMEOUT_MS) || 2500);
  const timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));
    const model = process.env.GROQ_SUMMARY_MODEL || 'llama-3.1-8b-instant';
    const tons = (input.totalEmissions / 1000).toFixed(2);
    const topLine = input.topSource ? `${input.topSource.percentage.toFixed(1)}% ile en yüksek kaynak: ${input.topSource.name}.` : '';
    const system = 'Sen bir sürdürülebilirlik analistisın. İnşaat projesi için karbon raporu özetini profesyonel, kısa ve Türkçe olarak yaz.';
    const user = `Proje: ${input.projectName || 'Proje'}\nDönem: ${input.dateStart} - ${input.dateEnd}\nToplam emisyon: ${tons} tCO2e\nKayıt sayısı: ${input.entryCount}\n${topLine}\nİstek: En fazla 2-3 cümlelik, yalın ve yönetici dostu bir özet yaz. Abartısız ve somut ifadeler kullan.`;
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0.2,
        max_tokens: 160,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data?.choices?.[0]?.message?.content?.trim?.();
    if (!text) return null;
    // Safety: ensure very short result
    return text.split('\n').slice(0, 4).join(' ').slice(0, 600);
  } catch {
    return null;
  }
}
