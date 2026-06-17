"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const [step, setStep] = useState<"choice" | "invite-sent" | "enter-code">("choice");
  const [inviteCode, setInviteCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function createInvite() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Maak een couple aan voor deze gebruiker
    const { data: couple, error: coupleError } = await supabase
      .from("couples")
      .insert({ user_id_1: user.id })
      .select()
      .single();

    if (coupleError) { setError(coupleError.message); setLoading(false); return; }

    // Genereer invite code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await supabase.from("couple_invites").insert({
      code,
      created_by: user.id,
      couple_id: couple.id,
    });

    await supabase.from("profiles").update({ couple_id: couple.id }).eq("id", user.id);

    setGeneratedCode(code);
    setStep("invite-sent");
    setLoading(false);
  }

  async function useInvite() {
    setLoading(true);
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: invite, error: inviteError } = await supabase
      .from("couple_invites")
      .select("*, couples(*)")
      .eq("code", inviteCode.toUpperCase())
      .is("used_by", null)
      .single();

    if (inviteError || !invite) {
      setError("Code niet gevonden of al gebruikt.");
      setLoading(false);
      return;
    }

    // Koppel user_id_2 aan het couple
    await supabase.from("couples").update({ user_id_2: user.id }).eq("id", invite.couple_id);
    await supabase.from("couple_invites").update({ used_by: user.id, used_at: new Date().toISOString() }).eq("id", invite.id);
    await supabase.from("profiles").update({ couple_id: invite.couple_id }).eq("id", user.id);

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-pale px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Couple<span className="text-accent">Sync</span>
          </h1>
          <p className="mt-1 text-soft text-sm">Verbind met je partner</p>
        </div>

        {step === "choice" && (
          <div className="space-y-3">
            <button
              onClick={createInvite}
              disabled={loading}
              className="w-full bg-ink text-white py-4 rounded-2xl font-medium text-sm hover:bg-soft transition-colors disabled:opacity-50"
            >
              {loading ? "Bezig..." : "Ik nodig mijn partner uit"}
            </button>
            <button
              onClick={() => setStep("enter-code")}
              className="w-full bg-white border border-line text-ink py-4 rounded-2xl font-medium text-sm hover:border-accent transition-colors"
            >
              Ik heb een uitnodigingscode
            </button>
          </div>
        )}

        {step === "invite-sent" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-line text-center space-y-4">
            <p className="text-soft text-sm">Stuur deze code naar je partner:</p>
            <div className="text-4xl font-bold tracking-[0.3em] text-accent">{generatedCode}</div>
            <p className="text-xs text-soft">Geldig voor 7 dagen</p>
            <p className="text-sm text-soft">Zodra je partner de code invult, worden jullie gekoppeld.</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-ink text-white py-3 rounded-xl font-medium text-sm hover:bg-soft transition-colors"
            >
              Doorgaan naar dashboard
            </button>
          </div>
        )}

        {step === "enter-code" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-line space-y-4">
            {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
            <div>
              <label className="block text-xs font-medium text-soft uppercase tracking-wider mb-1">
                Uitnodigingscode
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full border border-line rounded-xl px-4 py-3 text-sm text-center tracking-widest uppercase focus:outline-none focus:border-accent"
                placeholder="ABC123"
                maxLength={6}
              />
            </div>
            <button
              onClick={useInvite}
              disabled={loading || inviteCode.length < 6}
              className="w-full bg-ink text-white py-3 rounded-xl font-medium text-sm hover:bg-soft transition-colors disabled:opacity-50"
            >
              {loading ? "Verbinden..." : "Koppel met partner"}
            </button>
            <button onClick={() => setStep("choice")} className="w-full text-soft text-sm hover:text-ink">
              ← Terug
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
