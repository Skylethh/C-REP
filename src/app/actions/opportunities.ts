"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Opportunity } from "@/lib/opportunitiesEngine";
import { createClient } from "@/lib/server";
import { computeOpportunitySignature, formatDelta } from "./opportunities.helpers";

const FALLBACK_MODEL = "llama-3.1-8b-instant";
const DEFAULT_MODEL = resolveModelName(process.env.GROQ_OPPORTUNITIES_MODEL);
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const CACHE_TTL_MINUTES = readNumberFromEnv(process.env.OPPORTUNITIES_AI_CACHE_TTL_MINUTES, 720);
const COOLDOWN_SECONDS = readNumberFromEnv(process.env.OPPORTUNITIES_AI_COOLDOWN_SECONDS, 60);
const DEFAULT_TIMEOUT_MS = Number(process.env.OPPORTUNITIES_AI_TIMEOUT_MS ?? 15000);

type SuccessResult = { success: true; suggestion: string; source: "cache" | "live"; cachedAt?: string };
type ErrorReason = "cooldown" | "invalid" | "not_configured" | "unsupported" | "unknown";
type ErrorResult = { success: false; error: string; reason?: ErrorReason; retryAt?: string };

export type AIEnrichmentResult = SuccessResult | ErrorResult;

type ProjectSummaryScope = { scope: string; totalKg: number; percentage: number };
type ProjectSummaryCategory = { category: string; totalKg: number; percentage: number };
type ProjectSummaryTrend = { currentKg: number; previousKg: number; changePercent: number | null };

export type ProjectSummaryStats = {
  totalKg: number;
  entryCount: number;
  scopeBreakdown: ProjectSummaryScope[];
  topCategories: ProjectSummaryCategory[];
  trend: ProjectSummaryTrend;
  truncated: boolean;
};

type ProjectAISummarySuccess = {
  success: true;
  summary: string;
  stats: ProjectSummaryStats;
  source: "live" | "cache";
  generatedAt: string;
};

type ProjectAISummaryError = { success: false; error: string };

export type ProjectAISummaryResult = ProjectAISummarySuccess | ProjectAISummaryError;

export async function getAIEnrichmentForOpportunity(opportunity: Opportunity, projectId: string): Promise<AIEnrichmentResult> {
  if (!isAIEnabled()) {
    return { success: false, error: "AI özelliği bu ortamda devre dışı bırakıldı.", reason: "unsupported" };
  }

  if (!opportunity) {
    return { success: false, error: "Geçersiz fırsat verisi alındı.", reason: "invalid" };
  }

  if (!projectId) {
    return { success: false, error: "Proje bilgisi bulunamadı.", reason: "invalid" };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { success: false, error: "AI entegrasyonu yapılandırılmadı (GROQ_API_KEY eksik).", reason: "not_configured" };
  }

  const prompt = buildPrompt(opportunity);
  if (!prompt) {
    return { success: false, error: "Bu fırsat tipi için AI desteği henüz eklenmedi.", reason: "unsupported" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Oturum bilgisi doğrulanamadı.", reason: "invalid" };
  }

  const { opportunityKey, baseHash } = computeOpportunitySignature(opportunity);
  const now = new Date();

  const { data: cachedRows, error: cacheError } = await supabase
    .from("opportunity_ai_enrichments")
    .select("ai_suggestion, base_hash, created_at")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .eq("opportunity_key", opportunityKey)
    .order("created_at", { ascending: false })
    .limit(1);

  if (cacheError) {
    console.warn("[opportunities-ai] cache lookup failed", cacheError);
  }

  if (!cacheError && cachedRows && cachedRows.length > 0) {
    const cached = cachedRows[0] as { ai_suggestion: string; base_hash: string; created_at: string | null };
    const createdAt = cached.created_at ? new Date(cached.created_at) : null;
    const isFresh = Boolean(createdAt) && now.getTime() - createdAt!.getTime() <= CACHE_TTL_MINUTES * 60 * 1000;
    if (isFresh && cached.base_hash === baseHash) {
      return {
        success: true,
        suggestion: cached.ai_suggestion,
        source: "cache",
        cachedAt: createdAt!.toISOString(),
      } satisfies SuccessResult;
    }
  }

  const { data: existingRun, error: runSelectError } = await supabase
    .from("opportunity_ai_runs")
    .select("last_invoked_at")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .eq("opportunity_key", opportunityKey)
    .maybeSingle();

  if (runSelectError) {
    console.warn("[opportunities-ai] run lookup failed", runSelectError);
  }

  if (existingRun?.last_invoked_at) {
    const lastInvoked = new Date(existingRun.last_invoked_at as string);
    const retryAt = new Date(lastInvoked.getTime() + COOLDOWN_SECONDS * 1000);
    if (retryAt > now) {
      return {
        success: false,
        error: `AI isteğini tekrar gönderebilmek için ${formatDelta(retryAt, now)} bekleyin.`,
        reason: "cooldown",
        retryAt: retryAt.toISOString(),
      } satisfies ErrorResult;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const callStartedAt = new Date();

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.4,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              "You are an expert sustainability consultant for the Turkish construction industry. Always respond in clear, plain Turkish. Provide concise explanations followed by actionable recommendations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await safeReadResponse(response);
      const interpreted = interpretGroqError(response.status, errorText);
      console.error("[opportunities-ai] Groq request failed", response.status, errorText);
      await recordRun(supabase, user.id, projectId, opportunityKey, callStartedAt);
      return { success: false, error: interpreted.message, reason: interpreted.reason } satisfies ErrorResult;
    }

    const payload = (await response.json()) as any;
    const suggestion = String(payload?.choices?.[0]?.message?.content ?? "").trim();
    if (!suggestion) {
      console.error("[opportunities-ai] Groq boş yanıt döndürdü", payload);
      await recordRun(supabase, user.id, projectId, opportunityKey, callStartedAt);
      return { success: false, error: "AI şu anda öneri üretemedi.", reason: "unknown" } satisfies ErrorResult;
    }

    await recordRun(supabase, user.id, projectId, opportunityKey, callStartedAt);

    const metadata = {
      model: DEFAULT_MODEL,
      source: "live",
      generatedAt: new Date().toISOString(),
    } satisfies Record<string, string>;

    const { error: cacheWriteError } = await supabase
      .from("opportunity_ai_enrichments")
      .upsert({
        user_id: user.id,
        project_id: projectId,
        opportunity_key: opportunityKey,
        base_hash: baseHash,
        ai_suggestion: suggestion,
        source_metadata: metadata,
      }, {
        onConflict: "user_id,project_id,opportunity_key,base_hash",
      });

    if (cacheWriteError) {
      console.warn("[opportunities-ai] cache write failed", cacheWriteError);
    }

    return { success: true, suggestion, source: "live" } satisfies SuccessResult;
  } catch (error) {
    await recordRun(supabase, user.id, projectId, opportunityKey, callStartedAt);
    if ((error as Error).name === "AbortError") {
      console.warn("[opportunities-ai] Groq isteği zaman aşımına uğradı", error);
      return { success: false, error: "AI isteği zaman aşımına uğradı.", reason: "unknown" } satisfies ErrorResult;
    }
    console.error("[opportunities-ai] Beklenmeyen hata", error);
    return { success: false, error: "AI isteği sırasında bir hata oluştu.", reason: "unknown" } satisfies ErrorResult;
  } finally {
    clearTimeout(timeout);
  }
}

function buildPrompt(opportunity: Opportunity): string | null {
  switch (opportunity.type) {
    case "CONCENTRATION": {
      const category = stringify(opportunity.data.category ?? opportunity.data.categoryKey ?? "belirtilmemiş kategori");
      const percentage = numberString(opportunity.data.percentage, { suffix: "%" });
      const categoryTotal = kgToTonString(opportunity.data.categoryTotalKg);
      const projectTotal = kgToTonString(opportunity.data.projectTotalKg);
      return [
        "Bir proje emisyon analizi tek bir kategoriye yoğunlaşıyor.",
        `Kategori: ${category}`,
        `Kategori payı: ${percentage}`,
        `Kategori toplam emisyonu: ${categoryTotal}`,
        `Proje toplam emisyonu: ${projectTotal}`,
        "Projeden sorumlu yöneticiyi bilgilendirecek kısa bir açıklama yaz.",
        "1. İlk paragrafta bu durumun neden önemli olduğunu sade Türkçe ile özetle.",
        "2. Ardından 'Önerilen Adımlar' başlığı altında en fazla iki maddelik uygulanabilir öneriler ver.",
        "Yanıt toplamda 110 kelimeyi geçmesin.",
      ].join("\n");
    }
    case "TREND_INCREASE": {
      const windowDays = numberString(opportunity.data.windowDays, { suffix: " gün" });
      const current = kgToTonString(opportunity.data.currentTotalKg);
      const previous = kgToTonString(opportunity.data.previousTotalKg);
      const increase = numberString(opportunity.data.increasePercentage, { suffix: "%" });
      return [
        "Bir proje emisyon trendi hızlı bir artış gösteriyor.",
        `Analiz penceresi: ${windowDays}`,
        `Son dönem toplam emisyonu: ${current}`,
        `Önceki dönem toplam emisyonu: ${previous}`,
        `Artış oranı: ${increase}`,
        "İlk paragrafta artışın etkisini ve muhtemel sebepleri sade Türkçe ile özetle.",
        "'Kontrol Edilecek Noktalar' başlığıyla en fazla üç madde halinde pratik kontroller veya azaltım önerileri sun.",
        "Yanıt toplamda 110 kelimeyi geçmesin.",
      ].join("\n");
    }
    case "ANOMALY_DETECTED": {
      const category = stringify(opportunity.data.category ?? opportunity.data.categoryKey ?? "belirtilmemiş kategori");
      const date = stringify(opportunity.data.date ?? "belirtilmemiş tarih");
      const ratio = numberString(opportunity.data.ratio, { suffix: " kat" });
      const value = kgToTonString(opportunity.data.valueKg);
      const mean = kgToTonString(opportunity.data.meanKg);
      const threshold = kgToTonString(opportunity.data.thresholdKg);
      return [
        "Bir emisyon kaydı, aynı kategorideki değerlerden çok daha yüksek görünüyor.",
        `Kategori: ${category}`,
        `Kayıt tarihi: ${date}`,
        `Değerin ortalamaya göre oranı: ${ratio}`,
        `Kayıt değeri: ${value}`,
        `Kategori ortalaması: ${mean}`,
        `İstatistiksel eşik: ${threshold}`,
        "Önce bir-iki cümleyle bu sapmanın neden dikkat çektiğini anlat.",
        "'Doğrulama Adımları' başlığıyla en fazla iki maddelik kısa bir kontrol listesi öner.",
        "Yanıt toplamda 110 kelimeyi geçmesin.",
      ].join("\n");
    }
    case "COST_CARBON_IMBALANCE": {
      const category = stringify(opportunity.data.category ?? opportunity.data.categoryKey ?? "belirtilmemiş kategori");
      const emissionShare = numberString(opportunity.data.emissionShare, { suffix: "%" });
      const spendShare = numberString(opportunity.data.spendShare, { suffix: "%" });
      const emissionTotal = kgToTonString(opportunity.data.emissionKg);
      const spendTotal = formatCurrency(opportunity.data.spendAmount, opportunity.data.currencyUnit);
      const sampleSize = numberString(opportunity.data.sampleSize, { suffix: " kayıt", maximumFractionDigits: 0 });
      return [
        "Bir maliyet kaleminin karbon yoğunluğu benzer kalemlere göre çok daha yüksek görünüyor.",
        `Kategori: ${category}`,
        `Emisyon payı: ${emissionShare}`,
        `Harcamadaki payı: ${spendShare}`,
        `Toplam emisyon: ${emissionTotal}`,
        `Tahmini harcama: ${spendTotal}`,
        `İncelenen kayıt sayısı: ${sampleSize}`,
        "Önce kısa bir paragrafla bu dengesizliğin bütçe-plan açısından neden kritik olduğunu açıkla.",
        "'Yapılabilecekler' başlığıyla en fazla iki maddelik aksiyon öner.",
        "Yanıt toplamda 110 kelimeyi geçmesin.",
      ].join("\n");
    }
    case "BENCHMARK_GAP": {
      const projectTotal = kgToTonString(opportunity.data.projectTotalKg);
      const peerMedian = kgToTonString(opportunity.data.peerMedianKg);
      const peerAverage = kgToTonString(opportunity.data.peerAverageKg);
      const deltaPercent = numberString(opportunity.data.deltaPercent, { suffix: "%" });
      const peerCount = numberString(opportunity.data.peerCount, { suffix: " proje", maximumFractionDigits: 0 });
      return [
        "Bir proje, aynı portföydeki benzer projelerin emisyon medyanının belirgin şekilde üzerinde.",
        `Proje toplam emisyonu: ${projectTotal}`,
        `Benzer projelerin medyanı: ${peerMedian}`,
        `Ortalama değer: ${peerAverage}`,
        `Fark oranı: ${deltaPercent}`,
        `Kıyaslanan proje sayısı: ${peerCount}`,
        "İlk paragrafta farkın ne anlama geldiğini ve olası kök nedenleri özetle.",
        "'Öncelikli Adımlar' başlığıyla en fazla iki maddelik hedefli aksiyon öner.",
        "Yanıt toplamda 110 kelimeyi geçmesin.",
      ].join("\n");
    }
    default:
      return null;
  }
}

function stringify(value: unknown): string {
  if (value === null || value === undefined) return "bilinmiyor";
  if (typeof value === "string") return value;
  if (typeof value === "number") return numberString(value);
  return JSON.stringify(value);
}

function numberString(value: unknown, options?: { suffix?: string; maximumFractionDigits?: number }): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "bilinmiyor";
  const formatted = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: options?.maximumFractionDigits ?? 1,
  }).format(numeric);
  return options?.suffix ? `${formatted}${options.suffix}` : formatted;
}

function kgToTonString(value: unknown): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "bilinmiyor";
  const tons = numeric / 1000;
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(tons)} ton CO₂e`;
}

function formatCurrency(value: unknown, unit: unknown): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "bilinmiyor";
  const code = typeof unit === "string" && unit.trim() ? unit.trim().toUpperCase() : "para";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(numeric)} ${code}`;
}

async function safeReadResponse(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function interpretGroqError(status: number, errorText: string): { message: string; reason: ErrorReason } {
  const fallback: { message: string; reason: ErrorReason } = {
    message: "AI servisi şu anda yanıt vermiyor.",
    reason: "unknown",
  };

  try {
    const parsed = JSON.parse(errorText);
    const errorPayload = (parsed?.error ?? parsed) as { code?: string; message?: string } | undefined;
    const code = typeof errorPayload?.code === "string" ? errorPayload.code : "";
    const message = typeof errorPayload?.message === "string" ? errorPayload.message : "";

    if (code === "model_decommissioned" || message.toLowerCase().includes("decommissioned")) {
      return {
        message: "Seçili AI modeli artık desteklenmiyor. Lütfen yapılandırmayı güncelleyin.",
        reason: "unsupported",
      } satisfies { message: string; reason: ErrorReason };
    }

    if (code === "invalid_api_key" || status === 401 || status === 403) {
      return {
        message: "AI servis anahtarı geçersiz veya yetkisiz görünüyor. Lütfen GROQ_API_KEY değerini kontrol edin.",
        reason: "not_configured",
      } satisfies { message: string; reason: ErrorReason };
    }

    if (code === "rate_limit_exceeded" || status === 429) {
      return {
        message: "AI hizmeti kısa süreliğine yoğun. Lütfen birazdan tekrar deneyin.",
        reason: "unknown",
      } satisfies { message: string; reason: ErrorReason };
    }
  } catch {
    // ignore JSON parsing errors
  }

  return fallback;
}

function readNumberFromEnv(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBooleanFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function isAIEnabled(): boolean {
  if (process.env.NODE_ENV === "test") {
    return readBooleanFromEnv(process.env.OPPORTUNITIES_AI_ENABLED, true);
  }
  const serverValue = readBooleanFromEnv(process.env.OPPORTUNITIES_AI_ENABLED, true);
  const publicValue = readBooleanFromEnv(process.env.NEXT_PUBLIC_OPPORTUNITIES_AI_ENABLED, serverValue);
  return publicValue;
}

function resolveModelName(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return FALLBACK_MODEL;

  const deprecatedMap: Record<string, string> = {
    "mixtral-8x7b-32768": FALLBACK_MODEL,
  };

  const replacement = deprecatedMap[trimmed];
  if (replacement) {
    console.warn(`[opportunities-ai] Model ${trimmed} deprecated; using ${replacement} instead.`);
    return replacement;
  }

  return trimmed;
}

async function recordRun(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  opportunityKey: string,
  runAt: Date,
): Promise<void> {
  const { error } = await supabase
    .from("opportunity_ai_runs")
    .upsert({
      user_id: userId,
      project_id: projectId,
      opportunity_key: opportunityKey,
      last_invoked_at: runAt.toISOString(),
    });

  if (error) {
    console.warn("[opportunities-ai] run tracking failed", error);
  }
}

export async function getProjectAISummary(projectId: string): Promise<ProjectAISummaryResult> {
  if (!projectId) {
    return { success: false, error: "Proje bilgisi eksik." } satisfies ProjectAISummaryError;
  }

  if (!isAIEnabled()) {
    return { success: false, error: "AI özelliği bu ortamda devre dışı." } satisfies ProjectAISummaryError;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { success: false, error: "AI entegrasyonu yapılandırılmadı (GROQ_API_KEY eksik)." } satisfies ProjectAISummaryError;
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Oturum doğrulanamadı." } satisfies ProjectAISummaryError;
  }

  const { rows, truncated, error: summaryError } = await loadProjectSummaryRows(supabase, projectId);
  if (summaryError) {
    console.error("[opportunities-ai] project summary load failed", summaryError);
    return { success: false, error: "Proje verileri okunamadı." } satisfies ProjectAISummaryError;
  }

  if (!rows.length) {
    return { success: false, error: "Analiz edilecek kayıt bulunamadı." } satisfies ProjectAISummaryError;
  }

  const stats = buildProjectSummaryStats(rows, truncated);

  const scopeParts = stats.scopeBreakdown
    .map((item) => `${item.scope}: %${Math.round(item.percentage)} (${kgToTonString(item.totalKg)})`)
    .join(", ");
  const categoryParts = stats.topCategories
    .map((item) => `${item.category}: %${Math.round(item.percentage)} (${kgToTonString(item.totalKg)})`)
    .join(", ");

  const trendChangeText = typeof stats.trend.changePercent === "number"
    ? `${stats.trend.changePercent >= 0 ? "+" : ""}${stats.trend.changePercent}%`
    : "veri yok";

  const prompt = [
    "Aşağıdaki proje emisyon özetini incele ve karar vericilere yönelik kısa bir değerlendirme hazırla.",
    `Toplam emisyon: ${kgToTonString(stats.totalKg)}`,
    `Analiz edilen kayıt sayısı: ${stats.entryCount}${stats.truncated ? " (ilk 3000 kayıt)" : ""}`,
    `Scope dağılımı: ${scopeParts || "veri yok"}`,
    `En yoğun kategoriler: ${categoryParts || "veri yok"}`,
    `Son 30 günlük emisyon: ${kgToTonString(stats.trend.currentKg)}`,
    `Önceki 30 günlük emisyon: ${kgToTonString(stats.trend.previousKg)}`,
    `Değişim oranı: ${trendChangeText}`,
    "1. En fazla iki cümleyle projenin mevcut durumunu özetle.",
    "2. 'Öne Çıkan Güçlü Alanlar' başlığıyla en fazla iki maddelik olumlu gözlem yaz.",
    "3. 'Önerilen İyileştirmeler' başlığıyla en fazla iki maddelik aksiyon öner.",
    "Yanıt toplamda 130 kelimeyi geçmesin. Sade ve motive edici Türkçe kullan.",
  ].join("\n");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.3,
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              "You are an expert sustainability consultant for the Turkish construction industry. Always respond in concise Turkish.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await safeReadResponse(response);
      const interpreted = interpretGroqError(response.status, errorText);
      console.error("[opportunities-ai] project summary Groq request failed", response.status, errorText);
      return { success: false, error: interpreted.message } satisfies ProjectAISummaryError;
    }

    const payload = (await response.json()) as any;
    const summary = String(payload?.choices?.[0]?.message?.content ?? "").trim();
    if (!summary) {
      return { success: false, error: "AI özet üretemedi." } satisfies ProjectAISummaryError;
    }

    return {
      success: true,
      summary,
      stats,
      source: "live",
      generatedAt: new Date().toISOString(),
    } satisfies ProjectAISummarySuccess;
  } catch (error) {
    console.error("[opportunities-ai] project summary unexpected error", error);
    return { success: false, error: "AI özet oluşturulurken bir hata oluştu." } satisfies ProjectAISummaryError;
  }
}

type SummaryRow = {
  co2e_value: number | string | null;
  scope: string | null;
  category: string | null;
  date: string | null;
};

async function loadProjectSummaryRows(
  supabase: SupabaseClient,
  projectId: string,
): Promise<{ rows: SummaryRow[]; truncated: boolean; error: Error | null }>
{
  const PAGE_SIZE = 1000;
  const MAX_RECORDS = 3000;
  let from = 0;
  let to = PAGE_SIZE - 1;
  const rows: SummaryRow[] = [];
  let totalCount: number | null = null;

  while (from <= MAX_RECORDS - PAGE_SIZE && (totalCount === null || from < Math.min(totalCount, MAX_RECORDS))) {
    const { data, error, count } = await supabase
      .from("entries")
      .select("co2e_value, scope, category, date", { count: "exact" })
      .eq("project_id", projectId)
      .order("date", { ascending: false })
      .range(from, to);

    if (error) {
      return { rows: [], truncated: false, error };
    }

    if (Array.isArray(data)) {
      rows.push(...(data as SummaryRow[]));
    }

    if (count !== null && count !== undefined) {
      totalCount = count;
      if (rows.length >= Math.min(totalCount, MAX_RECORDS)) {
        break;
      }
    } else if (!data || data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
    to = Math.min(from + PAGE_SIZE - 1, MAX_RECORDS - 1);
  }

  const truncated = totalCount !== null ? rows.length < totalCount : false;
  return { rows, truncated, error: null };
}

function buildProjectSummaryStats(rows: SummaryRow[], truncated: boolean): ProjectSummaryStats {
  let totalKg = 0;
  const scopeMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const now = new Date();
  const currentWindowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  currentWindowStart.setUTCDate(currentWindowStart.getUTCDate() - 29);
  const previousWindowStart = new Date(currentWindowStart);
  previousWindowStart.setUTCDate(previousWindowStart.getUTCDate() - 30);

  let currentWindowTotal = 0;
  let previousWindowTotal = 0;

  for (const row of rows) {
    const value = typeof row.co2e_value === "number" ? row.co2e_value : Number(row.co2e_value);
    if (!Number.isFinite(value) || value <= 0) continue;
    totalKg += value;

    const scopeKey = (row.scope ?? "belirtilmedi").toLowerCase();
    scopeMap.set(scopeKey, (scopeMap.get(scopeKey) ?? 0) + value);

    const categoryKey = (row.category ?? "Belirtilmeyen").trim() || "Belirtilmeyen";
    categoryMap.set(categoryKey, (categoryMap.get(categoryKey) ?? 0) + value);

    if (row.date) {
      const parsed = new Date(row.date);
      if (Number.isFinite(parsed.getTime())) {
        const dateUTC = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
        if (dateUTC >= currentWindowStart) {
          currentWindowTotal += value;
        } else if (dateUTC >= previousWindowStart && dateUTC < currentWindowStart) {
          previousWindowTotal += value;
        }
      }
    }
  }

  const scopeBreakdown: ProjectSummaryScope[] = Array.from(scopeMap.entries())
    .map(([scope, total]) => ({
      scope: scope || "belirtilmedi",
      totalKg: total,
      percentage: totalKg > 0 ? (total / totalKg) * 100 : 0,
    }))
    .sort((a, b) => b.totalKg - a.totalKg);

  const topCategories: ProjectSummaryCategory[] = Array.from(categoryMap.entries())
    .map(([category, total]) => ({
      category,
      totalKg: total,
      percentage: totalKg > 0 ? (total / totalKg) * 100 : 0,
    }))
    .sort((a, b) => b.totalKg - a.totalKg)
    .slice(0, 3);

  let changePercent: number | null = null;
  if (previousWindowTotal > 0) {
    changePercent = Math.round(((currentWindowTotal - previousWindowTotal) / previousWindowTotal) * 100);
  } else if (currentWindowTotal > 0) {
    changePercent = 100;
  }

  return {
    totalKg,
    entryCount: rows.length,
    scopeBreakdown,
    topCategories,
    trend: {
      currentKg: currentWindowTotal,
      previousKg: previousWindowTotal,
      changePercent,
    },
    truncated,
  } satisfies ProjectSummaryStats;
}
