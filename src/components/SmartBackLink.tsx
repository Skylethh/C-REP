"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import { useCallback } from "react";

interface Props {
  entriesHref: string; // e.g., "/entries"
  projectHref?: string; // e.g., `/projects/${projectId}#entries`
  className?: string;
  label?: string;
}

export function SmartBackLink({ entriesHref, projectHref, className, label = "Geri" }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const from = params.get("from");

      // Prefer history back when possible
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }

      // Explicit source fallback
      if (from === "project" && projectHref) {
        router.replace((projectHref as unknown) as Route);
        return;
      }
      if (from === "entries") {
        router.replace((entriesHref as unknown) as Route);
        return;
      }

      // Heuristic: if projectHref provided, assume entry came from project page
      if (projectHref) {
        router.replace((projectHref as unknown) as Route);
        return;
      }

      // Default fallback to entries list
      router.replace((entriesHref as unknown) as Route);
    },
    [params, projectHref, entriesHref, router]
  );

  return (
    <Link
      href={(entriesHref as unknown) as Route}
      onClick={handleClick}
      className={
        className ||
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/80 hover:text-white transition-colors"
      }
      aria-label="Geri"
    >
      <ArrowLeft size={16} />
      <span>{label}</span>
    </Link>
  );
}
