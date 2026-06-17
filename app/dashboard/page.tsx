import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, couples(user_id_1, user_id_2)")
    .eq("id", user.id)
    .single();

  const hasPartner = profile?.couples &&
    profile.couples.user_id_1 &&
    profile.couples.user_id_2;

  // Haal recente syncs op
  const { data: recentSyncs } = await supabase
    .from("syncs")
    .select("*")
    .eq("couple_id", profile?.couple_id ?? "")
    .order("created_at", { ascending: false })
    .limit(5);

  // Openstaande acties
  const { data: openActions } = await supabase
    .from("actions")
    .select("*")
    .eq("couple_id", profile?.couple_id ?? "")
    .eq("status", "open")
    .order("deadline", { ascending: true });

  return (
    <div className="min-h-screen bg-pale">
      {/* Header */}
      <header className="bg-white border-b border-line px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          Couple<span className="text-accent">Sync</span>
        </h1>
        <form action="/api/auth/logout" method="POST">
          <button className="text-sm text-soft hover:text-ink">Uitloggen</button>
        </form>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Geen partner gekoppeld */}
        {!hasPartner && (
          <div className="bg-white rounded-2xl p-6 border border-line">
            <p className="text-sm font-medium text-ink mb-1">Partner koppelen</p>
            <p className="text-sm text-soft mb-4">
              Nodig je partner uit om CoupleSync samen te gebruiken.
            </p>
            <Link
              href="/onboarding"
              className="inline-block bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Partner uitnodigen
            </Link>
          </div>
        )}

        {/* Nieuwe sync starten */}
        {hasPartner && (
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/sync/new?type=week"
              className="bg-white rounded-2xl p-5 border border-line hover:border-p1 transition-colors group"
            >
              <div className="text-2xl mb-2">📋</div>
              <p className="font-semibold text-sm">Mini Sync</p>
              <p className="text-xs text-soft mt-1">Wekelijks check-in</p>
              <p className="text-xs text-p1 mt-3 font-medium group-hover:underline">Starten →</p>
            </Link>
            <Link
              href="/sync/new?type=maand"
              className="bg-white rounded-2xl p-5 border border-line hover:border-p2 transition-colors group"
            >
              <div className="text-2xl mb-2">🗓️</div>
              <p className="font-semibold text-sm">Grote Sync</p>
              <p className="text-xs text-soft mt-1">Maandelijkse review</p>
              <p className="text-xs text-p2 mt-3 font-medium group-hover:underline">Starten →</p>
            </Link>
          </div>
        )}

        {/* Openstaande acties */}
        {openActions && openActions.length > 0 && (
          <div className="bg-white rounded-2xl border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-semibold text-sm">Openstaande acties</h2>
            </div>
            <ul className="divide-y divide-line">
              {openActions.map((action) => (
                <li key={action.id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm">{action.title}</span>
                  {action.deadline && (
                    <span className="text-xs text-soft">
                      {new Date(action.deadline).toLocaleDateString("nl-NL")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recente syncs */}
        {recentSyncs && recentSyncs.length > 0 && (
          <div className="bg-white rounded-2xl border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h2 className="font-semibold text-sm">Recente syncs</h2>
            </div>
            <ul className="divide-y divide-line">
              {recentSyncs.map((sync) => (
                <li key={sync.id} className="px-5 py-3">
                  <Link href={`/sync/${sync.id}`} className="flex items-center justify-between group">
                    <span className="text-sm">
                      {sync.type === "week" ? "Mini Sync" : "Grote Sync"}
                    </span>
                    <span className="text-xs text-soft">
                      {sync.status === "completed" ? "✓ Afgerond" :
                       sync.status === "user1_done" ? "Wacht op partner" : "In uitvoering"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
