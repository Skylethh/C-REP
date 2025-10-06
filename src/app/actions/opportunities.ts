"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Opportunity } from "@/lib/opportunitiesEngine";
import { createClient } from "@/lib/server";
import { computeOpportunitySignature, formatDelta } from "./opportunities.helpers";

const DEFAULT_MODEL = process.env.GROQ_OPPORTUNITIES_MODEL ?? "mixtral-8x7b-32768";
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const CACHE_TTL_MINUTES = readNumberFromEnv(process.env.OPPORTUNITIES_AI_CACHE_TTL_MINUTES, 720);
const COOLDOWN_SECONDS = readNumberFromEnv(process.env.OPPORTUNITIES_AI_COOLDOWN_SECONDS, 60);
const DEFAULT_TIMEOUT_MS = Number(process.env.OPPORTUNITIES_AI_TIMEOUT_MS ?? 15000);

type SuccessResult = { success: true; suggestion: string; source: "cache" | "live"; cachedAt?: string };
type ErrorReason = "cooldown" | "invalid" | "not_configured" | "unsupported" | "unknown";
type ErrorResult = { success: false; error: string; reason?: ErrorReason; retryAt?: string };

export type AIEnrichmentResult = SuccessResult | ErrorResult;

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
      console.error("[opportunities-ai] Groq request failed", response.status, errorText);
      await recordRun(supabase, user.id, projectId, opportunityKey, callStartedAt);
      return { success: false, error: "AI servisi şu anda yanıt vermiyor.", reason: "unknown" } satisfies ErrorResult;
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
        "1. İlk paragrafta bu durumun neden önemli olduğunu basitçe açıkla.",
        "2. Ardından 'Önerilen Adımlar' başlığı altında iki maddelik bir listeyle yapılabilir aksiyonları yaz.",
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
        "İlk paragrafta artışın etkisini ve muhtemel sebepleri sade Türkçe ile açıkla.",
        "'Kontrol Edilecek Noktalar' başlığıyla iki-üç madde halinde pratik kontroller veya azaltım önerileri sun.",
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
        "'Doğrulama Adımları' başlığıyla iki maddelik kontrol listesi öner.",
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

function numberString(value: unknown, options?: { suffix?: string }): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "bilinmiyor";
  const formatted = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(numeric);
  return options?.suffix ? `${formatted}${options.suffix}` : formatted;
}

function kgToTonString(value: unknown): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return "bilinmiyor";
  const tons = numeric / 1000;
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(tons)} ton CO₂e`;
}

async function safeReadResponse(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
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
