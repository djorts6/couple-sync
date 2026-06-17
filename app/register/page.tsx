"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").update({ display_name: name }).eq("id", data.user.id);
    }

    router.push("/onboarding");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-pale px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Couple<span className="text-accent">Sync</span>
          </h1>
          <p className="mt-1 text-soft text-sm">Account aanmaken</p>
        </div>

        <form onSubmit={handleRegister} className="bg-white rounded-2xl p-6 shadow-sm border border-line space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-soft uppercase tracking-wider mb-1">Voornaam</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              placeholder="Jouw naam"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-soft uppercase tracking-wider mb-1">E-mailadres</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              placeholder="jij@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-soft uppercase tracking-wider mb-1">Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full border border-line rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
              placeholder="Minimaal 8 tekens"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-white py-3 rounded-xl font-medium text-sm hover:bg-soft transition-colors disabled:opacity-50"
          >
            {loading ? "Account aanmaken..." : "Start gratis proefperiode"}
          </button>
          <p className="text-xs text-soft text-center">14 dagen gratis — geen creditcard nodig</p>
        </form>

        <p className="text-center text-sm text-soft mt-6">
          Al een account?{" "}
          <Link href="/login" className="text-accent font-medium hover:underline">Inloggen</Link>
        </p>
      </div>
    </div>
  );
}
