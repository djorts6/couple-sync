import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const SECTION_LABELS: Record<string, string> = {
  check_in: "Relatie check-in",
  prioriteiten: "Prioriteiten",
  jaarplanning: "Jaarplanning",
  financien: "Financiën",
};

const QUESTION_LABELS: Record<string, string> = {
  check_in_slider: "Hoe zit je erin?",
  check_in_toelichting: "Toelichting",
  blij_moment: "Blij moment",
  wrijving: "Wrijving / draagt bij je",
  nodig: "Wat heb je nodig?",
  maand_persoonlijk: "Maand als persoon",
  maand_stel: "Maand als stel",
  niet_uitgesproken: "Niet uitgesproken",
  waardering: "Waardering voor de ander",
  terugblik: "Terugblik vorige maand",
  prioriteit_1: "Prioriteit 1",
  prioriteit_2: "Prioriteit 2",
  prioriteit_3: "Prioriteit 3",
  gepland_maand: "Gepland komende maand",
  gepland_kwartaal: "Gepland kwartaal",
  leuke_dingen: "Leuke dingen inplannen",
  inkomsten_uitgaven: "Inkomsten & uitgaven",
  grote_uitgaven: "Grote uitgaven",
  spaardoelen: "Spaardoelen",
};

export default async function SyncDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sync } = await supabase
    .from("syncs")
    .select("*")
    .eq("id", id)
    .single();

  if (!sync) redirect("/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id, display_name")
    .eq("id", user.id)
    .single();

  // Als sync nog niet completed, toon wachtscherm
  if (sync.status !== "completed") {
    const userDone = sync.status === "user1_done";
    return (
      <div className="min-h-screen bg-pale flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-6">
          <h1 className="text-3xl font-bold">
            Couple<span className="text-accent">Sync</span>
          </h1>
          {userDone ? (
            <>
              <div className="text-4xl">⏳</div>
              <p className="font-medium">Klaar! Wacht op je partner.</p>
              <p className="text-soft text-sm">
                Zodra jullie beiden hebben ingevuld, zie je hier de gezamenlijke resultaten.
              </p>
            </>
          ) : (
            <>
              <div className="text-4xl">📋</div>
              <p className="font-medium">Deze sync is nog open.</p>
              <Link
                href={`/sync/new?type=${sync.type}`}
                className="inline-block bg-accent text-white px-6 py-3 rounded-xl text-sm font-medium hover:opacity-90"
              >
                Invullen →
              </Link>
            </>
          )}
          <Link href="/dashboard" className="block text-sm text-soft hover:text-ink">
            ← Terug naar dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Haal alle antwoorden op
  const { data: responses } = await supabase
    .from("sync_responses")
    .select("*")
    .eq("sync_id", id);

  // Haal gebruikersprofielen op voor namen
  const { data: couple } = await supabase
    .from("couples")
    .select("user_id_1, user_id_2")
    .eq("id", sync.couple_id)
    .single();

  const userIds = [couple?.user_id_1, couple?.user_id_2].filter(Boolean);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", userIds as string[]);

  const nameMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.display_name || p.email?.split("@")[0] || "Partner"])
  );

  // Groepeer antwoorden per sectie
  const bySection: Record<string, Record<string, Record<string, string | number>>> = {};
  for (const r of responses ?? []) {
    if (!bySection[r.section]) bySection[r.section] = {};
    if (!bySection[r.section][r.question_key]) bySection[r.section][r.question_key] = {};
    bySection[r.section][r.question_key][r.user_id] =
      r.answer_slider !== null ? r.answer_slider : r.answer_text ?? "";
  }

  // Acties
  const { data: actions } = await supabase
    .from("actions")
    .select("*")
    .eq("sync_id", id)
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-pale">
      <header className="bg-white border-b border-line px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          Couple<span className="text-accent">Sync</span>
        </h1>
        <span className="text-sm text-soft">
          {sync.type === "week" ? "Mini Sync" : "Grote Sync"} — resultaten
        </span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {Object.entries(bySection).map(([section, questions]) => (
          <div key={section}>
            <h2 className="text-xs font-semibold text-soft uppercase tracking-widest mb-3">
              {SECTION_LABELS[section] ?? section}
            </h2>
            <div className="space-y-3">
              {Object.entries(questions).map(([qKey, userAnswers]) => (
                <div key={qKey} className="bg-white rounded-2xl border border-line overflow-hidden">
                  <div className="px-5 py-3 border-b border-line bg-pale">
                    <p className="text-xs font-medium text-soft">{QUESTION_LABELS[qKey] ?? qKey}</p>
                  </div>
                  <div className="divide-y divide-line">
                    {userIds.map((uid) =>
                      uid && userAnswers[uid] !== undefined ? (
                        <div key={uid} className="px-5 py-3 flex gap-4">
                          <span
                            className={`text-xs font-semibold mt-0.5 ${
                              uid === couple?.user_id_1 ? "text-p1" : "text-p2"
                            }`}
                          >
                            {nameMap[uid]}
                          </span>
                          <span className="text-sm flex-1">
                            {typeof userAnswers[uid] === "number"
                              ? `${userAnswers[uid]}/10`
                              : String(userAnswers[uid])}
                          </span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Actietabel */}
        {actions && actions.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-soft uppercase tracking-widest mb-3">
              Afspraken
            </h2>
            <div className="bg-white rounded-2xl border border-line overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-pale">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs text-soft font-medium">Actie</th>
                    <th className="text-left px-4 py-3 text-xs text-soft font-medium">Wie</th>
                    <th className="text-left px-4 py-3 text-xs text-soft font-medium">Deadline</th>
                    <th className="px-4 py-3 text-xs text-soft font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {actions.map((a) => (
                    <tr key={a.id}>
                      <td className="px-5 py-3">{a.title}</td>
                      <td className="px-4 py-3 text-soft">{nameMap[a.assigned_to] ?? "—"}</td>
                      <td className="px-4 py-3 text-soft">
                        {a.deadline ? new Date(a.deadline).toLocaleDateString("nl-NL") : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            a.status === "done"
                              ? "bg-green-pale text-green"
                              : "bg-pale text-soft"
                          }`}
                        >
                          {a.status === "done" ? "✓ Klaar" : "Open"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Link
          href="/dashboard"
          className="inline-block text-sm text-soft hover:text-ink pb-8"
        >
          ← Terug naar dashboard
        </Link>
      </main>
    </div>
  );
}
