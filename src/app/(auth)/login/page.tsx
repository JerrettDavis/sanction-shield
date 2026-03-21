"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = getSupabase();
  const isLocalDev = !supabase;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (isLocalDev) {
      router.push("/screen");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase!.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/screen");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">SS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sign in to SanctionShield</h1>
          <p className="text-sm text-gray-500 mt-1">Sanctions screening for your business</p>
        </div>

        {isLocalDev && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-sm text-blue-800">
            Local dev mode — no authentication required.
            <button
              onClick={() => router.push("/screen")}
              className="block mt-2 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enter Dashboard
            </button>
          </div>
        )}

        {!isLocalDev && (
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="Your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="flex justify-between text-sm">
              <Link href="/register" className="text-emerald-600 hover:text-emerald-700">Create account</Link>
              <Link href="/forgot-password" className="text-gray-500 hover:text-gray-700">Forgot password?</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
