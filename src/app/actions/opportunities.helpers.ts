import { createHash } from "node:crypto";
import type { Opportunity } from "@/lib/opportunitiesEngine";

export function formatDelta(target: Date, reference: Date): string {
  const diffMs = target.getTime() - reference.getTime();
  const totalSeconds = Math.max(1, Math.ceil(diffMs / 1000));
  if (totalSeconds < 60) {
    return `${totalSeconds} saniye`;
  }
  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${totalMinutes} dakika`;
  }
  const totalHours = Math.ceil(totalMinutes / 60);
  if (totalHours < 24) {
    return `${totalHours} saat`;
  }
  const totalDays = Math.ceil(totalHours / 24);
  return `${totalDays} gün`;
}

export function computeOpportunitySignature(opportunity: Opportunity): { opportunityKey: string; baseHash: string } {
  const normalizedData = normalizeValue(opportunity.data ?? {});
  const dataSignature = JSON.stringify({ type: opportunity.type, data: normalizedData });
  const baseSignature = JSON.stringify({ type: opportunity.type, data: normalizedData, suggestion: opportunity.suggestion });
  return {
    opportunityKey: createHash("sha256").update(dataSignature).digest("hex"),
    baseHash: createHash("sha256").update(baseSignature).digest("hex"),
  };
}

export function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return entries.reduce<Record<string, unknown>>((acc, [key, val]) => {
      acc[key] = normalizeValue(val);
      return acc;
    }, {});
  }
  return value;
}
