"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface Action {
  id: string;
  title: string;
  assigned_to: string | null;
  deadline: string | null;
}

interface Sync {
  id: string;
  type: "week" | "maand";
  couple_id: string;
}

interface Props {
  sync: Sync;
  userId: string;
  openActions: Action[];
  avgSlider: number | null;
}

const WEEK_QUESTIONS = [
  { section: "check_in", key: "check_in_slider", label: "Hoe zit je erin deze week?", type: "slider" },
  { section: "check_in", key: "check_in_toelichting", label: "Toelichting (optioneel)", type: "text" },
  { section: "check_in", key: "blij_moment", label: "Wat was een moment deze week waar je blij mee was?", type: "text" },
  { section: "check_in", key: "wrijving", label: "Was er iets wat wrijving gaf, of wat je bij je draagt?", type: "text" },
  { section: "check_in", key: "nodig", label: "Wat heb je nodig van mij de komende week?", type: "text" },
  { section: "prioriteiten", key: "prioriteit_1", label: "Prioriteit 1 deze week", type: "text" },
  { section: "prioriteiten", key: "prioriteit_2", label: "Prioriteit 2 deze week", type: "text" },
  { section: "prioriteiten", key: "prioriteit_3", label: "Prioriteit 3 deze week", type: "text" },
];

const MAAND_QUESTIONS = [
  { section: "check_in", key: "check_in_slider", label: "Hoe zit je erin deze maand?", type: "slider" },
  { section: "check_in", key: "check_in_toelichting", label: "Toelichting", type: "text" },
  { section: "check_in", key: "maand_persoonlijk", label: "Hoe was deze maand voor jou als persoon?", type: "text" },
  { section: "check_in", key: "maand_stel", label: "Hoe was deze maand voor ons als stel?", type: "text" },
  { section: "check_in", key: "niet_uitgesproken", label: "Was er iets wat je niet hebt uitgesproken maar wel bij je droeg?", type: "text" },
  { section: "check_in", key: "waardering", label: "Wat waardeer je aan de ander dit moment?", type: "text" },
  { section: "prioriteiten", key: "terugblik", label: "Welke prioriteiten van vorige maand zijn gelukt?", type: "text" },
  { section: "prioriteiten", key: "prioriteit_1", label: "Prioriteit 1 komende maand", type: "text" },
  { section: "prioriteiten", key: "prioriteit_2", label: "Prioriteit 2 komende maand", type: "text" },
  { section: "prioriteiten", key: "prioriteit_3", label: "Prioriteit 3 komende maand", type: "text" },
  { section: "jaarplanning", key: "gepland_maand", label: "Wat staat er gepland de komende maand?", type: "text" },
  { section: "jaarplanning", key: "gepland_kwartaal", label: "Wat staat er op de agenda voor het kwartaal?", type: "text" },
  { section: "jaarplanning", key: "leuke_dingen", label: "Welke leuke dingen plannen we in?", type: "text" },
  { section: "financien", key: "inkomsten_uitgaven", label: "Overzicht inkomsten en uitgaven deze maand", type: "text" },
  { section: "financien", key: "grote_uitgaven", label: "Grote of onverwachte uitgaven", type: "text" },
  { section: "financien", key: "spaardoelen", label: "Voortgang spaardoelen en investeringen", type: "text" },
];

export default function SyncForm({ sync, userId, openActions, avgSlider }: Props) {
  const questions = sync.type === "week" ? WEEK_QUESTIONS : MAAND_QUESTIONS;
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [newActions, setNewActions] = useState<{ title: string; assigned_to: string; deadline: string }[]>([
    { title: "", assigned_to: "", deadline: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const router = useRouter();
  const supabase = createClient();

  const sections = [...new Set(questions.map((q) => q.section))];
  const sectionLabels: Record<string, string> = {
    check_in: "Relatie check-in",
    prioriteiten: "Prioriteiten & acties",
    jaarplanning: "Jaarplanning",
    financien: "Financiën",
  };

  const currentSectionKey = sections[currentSection];
  const currentQuestions = questions.filter((q) => q.section === currentSectionKey);

  function setAnswer(key: string, value: string | number) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    const supabaseClient = createClient();

    // Sla antwoorden op
    const responses = questions
      .filter((q) => answers[q.key] !== undefined && answers[q.key] !== "")
      .map((q) => ({
        sync_id: sync.id,
        user_id: userId,
        section: q.section,
        question_key: q.key,
        answer_text: q.type === "text" ? String(answers[q.key]) : null,
        answer_slider: q.type === "slider" ? Number(answers[q.key]) : null,
      }));

    await supabaseClient.from("sync_responses").upsert(responses, {
      onConflict: "sync_id,user_id,question_key",
    });

    // Sla nieuwe acties op
    const validActions = newActions.filter((a) => a.title.trim());
    if (validActions.length > 0) {
      await supabaseClient.from("actions").insert(
        validActions.map((a) => ({
          sync_id: sync.id,
          couple_id: sync.couple_id,
          title: a.title,
          assigned_to: a.assigned_to || null,
          deadline: a.deadline || null,
        }))
      );
    }

    // Update sync status
    const { data: existingResponses } = await supabaseClient
      .from("sync_responses")
      .select("user_id")
      .eq("sync_id", sync.id);

    const uniqueUsers = new Set(existingResponses?.map((r) => r.user_id) ?? []);
    const newStatus = uniqueUsers.size >= 2 ? "completed" : "user1_done";

    await supabaseClient
      .from("syncs")
      .update({
        status: newStatus,
        ...(newStatus === "user1_done" ? { user1_done_at: new Date().toISOString() } : {}),
        ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", sync.id);

    router.push(`/sync/${sync.id}`);
  }

  const isLastSection = currentSection === sections.length - 1;

  return (
    <div className="min-h-screen bg-pale">
      <header className="bg-white border-b border-line px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">
          Couple<span className="text-accent">Sync</span>
        </h1>
        <span className="text-sm text-soft">
          {sync.type === "week" ? "Mini Sync" : "Grote Sync"}
        </span>
      </header>

      {/* Voortgangsbalk */}
      <div className="flex border-b border-line bg-white">
        {sections.map((s, i) => (
          <div
            key={s}
            className={`flex-1 py-2 text-center text-xs font-medium cursor-pointer transition-colors ${
              i === currentSection
                ? "border-b-2 border-accent text-accent"
                : i < currentSection
                ? "text-soft border-b-2 border-line"
                : "text-soft"
            }`}
            onClick={() => i <= currentSection && setCurrentSection(i)}
          >
            {sectionLabels[s]}
          </div>
        ))}
      </div>

      <main className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <h2 className="text-xl font-bold">{sectionLabels[currentSectionKey]}</h2>

        {/* Openstaande acties tonen bovenaan prioriteiten */}
        {currentSectionKey === "prioriteiten" && openActions.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-line">
            <p className="text-xs font-medium text-soft uppercase tracking-wider mb-3">
              Nog open van vorige keer
            </p>
            <ul className="space-y-2">
              {openActions.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                  <span>{a.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Gemiddelde slider tonen in grote sync */}
        {currentSectionKey === "check_in" && avgSlider !== null && (
          <div className="bg-p1-pale rounded-xl px-4 py-3 text-sm text-p1">
            Jouw gemiddelde score de afgelopen 4 weken: <strong>{avgSlider}/10</strong>
          </div>
        )}

        {/* Vragen */}
        <div className="space-y-5">
          {currentQuestions.map((q) => (
            <div key={q.key} className="bg-white rounded-2xl p-5 border border-line">
              <label className="block text-sm font-medium mb-3">{q.label}</label>
              {q.type === "slider" ? (
                <div className="space-y-2">
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={answers[q.key] ?? 5}
                    onChange={(e) => setAnswer(q.key, Number(e.target.value))}
                    className="w-full accent-accent"
                  />
                  <div className="flex justify-between text-xs text-soft">
                    <span>1 — Niet goed</span>
                    <span className="font-bold text-accent text-base">
                      {answers[q.key] ?? 5}
                    </span>
                    <span>10 — Uitstekend</span>
                  </div>
                </div>
              ) : (
                <textarea
                  value={String(answers[q.key] ?? "")}
                  onChange={(e) => setAnswer(q.key, e.target.value)}
                  rows={3}
                  className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent resize-none"
                  placeholder="Jouw antwoord..."
                />
              )}
            </div>
          ))}
        </div>

        {/* Actietabel in prioriteiten sectie */}
        {currentSectionKey === "prioriteiten" && (
          <div className="bg-white rounded-2xl border border-line overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <p className="text-sm font-medium">Afspraken — wie doet wat?</p>
            </div>
            <div className="p-4 space-y-3">
              {newActions.map((action, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Actie"
                    value={action.title}
                    onChange={(e) => {
                      const updated = [...newActions];
                      updated[i].title = e.target.value;
                      setNewActions(updated);
                    }}
                    className="col-span-1 border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    placeholder="Wie"
                    value={action.assigned_to}
                    onChange={(e) => {
                      const updated = [...newActions];
                      updated[i].assigned_to = e.target.value;
                      setNewActions(updated);
                    }}
                    className="border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                  />
                  <input
                    type="date"
                    value={action.deadline}
                    onChange={(e) => {
                      const updated = [...newActions];
                      updated[i].deadline = e.target.value;
                      setNewActions(updated);
                    }}
                    className="border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setNewActions([...newActions, { title: "", assigned_to: "", deadline: "" }])
                }
                className="text-sm text-accent hover:underline"
              >
                + Actie toevoegen
              </button>
            </div>
          </div>
        )}

        {/* Navigatieknoppen */}
        <div className="flex gap-3 pb-8">
          {currentSection > 0 && (
            <button
              onClick={() => setCurrentSection((s) => s - 1)}
              className="flex-1 bg-white border border-line text-ink py-3 rounded-xl font-medium text-sm hover:border-accent transition-colors"
            >
              ← Vorige
            </button>
          )}
          {!isLastSection ? (
            <button
              onClick={() => setCurrentSection((s) => s + 1)}
              className="flex-1 bg-ink text-white py-3 rounded-xl font-medium text-sm hover:bg-soft transition-colors"
            >
              Volgende →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-accent text-white py-3 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Opslaan..." : "Klaar — opslaan ✓"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
