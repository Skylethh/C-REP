import { redirect } from "next/navigation";
import { createClient } from "@/lib/server";
import ProfileSettingsClient from "./ProfileSettingsClient";

function generateDisplayNameFromEmail(email: string) {
  const [localPart] = email.split("@");

  if (!localPart) {
    return "Ekip Arkadaşı";
  }

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => {
      const lower = segment.toLocaleLowerCase("tr-TR");
      return lower.charAt(0).toLocaleUpperCase("tr-TR") + lower.slice(1);
    })
    .join(" ");
}

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user?.email ?? "";
  const defaultDisplayName = email ? generateDisplayNameFromEmail(email) : "Ekip Arkadaşı";

  return <ProfileSettingsClient initialDisplayName={defaultDisplayName} />;
}
