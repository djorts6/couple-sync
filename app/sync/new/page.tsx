export const runtime = 'edge';

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SyncForm from "@/components/SyncForm";

export default async function NewSyncPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const syncType = type === "maand" ? "maand" : "week";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", user.id)
    .single();

  if (!profile?.couple_id) redirect("/onboarding");

  // Haal openstaande acties op voor automatisch inladen
  const { data: openActions } = await supabase
    .from("actions")
    .select("id, title, assigned_to, deadline")
    .eq("couple_id", profile.couple_id)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  // Haal gemiddelde slider scores op voor Grote Sync (laatste 4 weken)
  let avgSlider: number | null = null;
  if (syncType === "maand") {
    const { data: weekSyncs } = await supabase
      .from("syncs")
      .select("id")
      .eq("couple_id", profile.couple_id)
      .eq("type", "week")
      .eq("status", "completed")
      .gte("created_at", new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false });

    if (weekSyncs && weekSyncs.length > 0) {
      const syncIds = weekSyncs.map((s) => s.id);
      const { data: sliders } = await supabase
        .from("sync_responses")
        .select("answer_slider")
        .in("sync_id", syncIds)
        .eq("user_id", user.id)
        .eq("question_key", "check_in_slider");

      if (sliders && sliders.length > 0) {
        const sum = sliders.reduce((acc, r) => acc + (r.answer_slider ?? 0), 0);
        avgSlider = Math.round((sum / sliders.length) * 10) / 10;
      }
    }
  }

  // Maak of hergebruik een open sync
  let sync;
  const { data: existingSync } = await supabase
    .from("syncs")
    .select("*")
    .eq("couple_id", profile.couple_id)
    .eq("type", syncType)
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingSync) {
    sync = existingSync;
  } else {
    const { data: newSync } = await supabase
      .from("syncs")
      .insert({ couple_id: profile.couple_id, type: syncType })
      .select()
      .single();
    sync = newSync;
  }

  if (!sync) redirect("/dashboard");

  return (
    <SyncForm
      sync={sync}
      userId={user.id}
      openActions={openActions ?? []}
      avgSlider={avgSlider}
    />
  );
}
