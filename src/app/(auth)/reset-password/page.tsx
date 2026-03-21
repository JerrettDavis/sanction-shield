"use client";

import { useState, useEffect } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hashError, setHashError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = getSupabaseBrowser();

  useEffect(() => {
    // Check for error in URL hash (from Supabase redirect)
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash.includes("error=")) {
        const params = new URLSearchParams(hash.slice(1));
        const errorDesc = params.get("error_description");
        if (errorDesc) {
          setHashError(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
        }
      }
    }
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push("/screen"), 2000);
  }

  if (hashError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Link Expired</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{hashError}</p>
          </div>
          <p className="text-sm text-gray-500 mb-4">Password reset links expire after 1 hour. Please request a new one.</p>
          <Link href="/forgot-password" className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Updated</h1>
          <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Set New Password</h1>
          <p className="text-sm text-gray-500 mt-1">Enter your new password below</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">{error}</div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">New password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Repeat your new password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
