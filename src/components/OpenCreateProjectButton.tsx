"use client";

import { Button } from "./button";
import { Plus } from "lucide-react";

export function OpenCreateProjectButton({ label = "Proje Oluştur", className = "btn-primary" }: { label?: string; className?: string }) {
  return (
    <Button
      className={className}
      onClick={() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("open-create-project"));
        }
      }}
    >
      <span className="font-medium">{label}</span>
      <Plus size={16} className="ml-2" />
    </Button>
  );
}
