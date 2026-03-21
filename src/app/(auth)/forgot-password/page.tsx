"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = getSupabase();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reset password</h1>
          <p className="text-sm text-gray-500 mt-1">We'll send you a reset link</p>
        </div>

        {sent ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm text-green-800">Check your email for a password reset link.</p>
            <Link href="/login" className="text-emerald-600 hover:text-emerald-700 text-sm mt-3 inline-block">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>
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
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <p className="text-center text-sm">
              <Link href="/login" className="text-gray-500 hover:text-gray-700">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
