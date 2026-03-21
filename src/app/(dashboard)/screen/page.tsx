"use client";

import { useState } from "react";

type ConfidenceBand = "HIGH" | "REVIEW" | "LOW";

interface MatchResult {
  confidence: number;
  band: ConfidenceBand;
  requires_review: boolean;
  list: string;
  entry: {
    sdn_id: string;
    entry_type: string;
    primary_name: string;
    aliases: string[];
    programs: string[];
    remarks?: string;
  };
  component_scores: {
    trigram: number;
    levenshtein: number;
    phonetic: number;
    token_overlap: number;
  };
}

interface ScreenResult {
  screened_at: string;
  input: { name: string; entity_type: string; threshold: number };
  matches: MatchResult[];
  list_versions: Record<string, string | null>;
  request_id: string;
}

const BAND_COLORS: Record<ConfidenceBand, string> = {
  HIGH: "bg-red-100 text-red-800 border-red-200",
  REVIEW: "bg-amber-100 text-amber-800 border-amber-200",
  LOW: "bg-blue-100 text-blue-800 border-blue-200",
};


export default function ScreenPage() {
  const [name, setName] = useState("");
  const [entityType, setEntityType] = useState("any");
  const [threshold, setThreshold] = useState(80);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScreenResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleScreen(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/v1/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), entity_type: entityType, threshold }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Error: ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Screening failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Screen Name</h1>
        <p className="text-sm text-gray-500 mt-1">
          Check a name against OFAC SDN, EU, and UN sanctions lists
        </p>
      </div>

      {/* Search form */}
      <form onSubmit={handleScreen} className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name to screen
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. BANCO NACIONAL DE CUBA"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              required
            />
          </div>
          <div className="w-40">
            <label htmlFor="entityType" className="block text-sm font-medium text-gray-700 mb-1">
              Entity type
            </label>
            <select
              id="entityType"
              value={entityType}
              onChange={e => setEntityType(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="any">Any</option>
              <option value="individual">Individual</option>
              <option value="organization">Organization</option>
              <option value="vessel">Vessel</option>
              <option value="aircraft">Aircraft</option>
            </select>
          </div>
          <div className="w-28">
            <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 mb-1">
              Threshold
            </label>
            <input
              id="threshold"
              type="number"
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              min={0}
              max={100}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Screening..." : "Screen"}
          </button>
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          {/* Summary bar */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                result.matches.length === 0
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}>
                {result.matches.length === 0 ? "CLEAR" : `${result.matches.length} MATCH${result.matches.length > 1 ? "ES" : ""}`}
              </div>
              <span className="text-sm text-gray-500">
                Screened &ldquo;{result.input.name}&rdquo; at {new Date(result.screened_at).toLocaleTimeString()}
              </span>
            </div>
            <span className="text-xs text-gray-400 font-mono">{result.request_id}</span>
          </div>

          {/* No matches */}
          {result.matches.length === 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <div className="text-4xl mb-3">&#10003;</div>
              <h3 className="text-lg font-semibold text-green-800">No Matches Found</h3>
              <p className="text-sm text-green-600 mt-1">
                &ldquo;{result.input.name}&rdquo; does not match any entries on the screened sanctions lists.
              </p>
              <p className="text-xs text-green-500 mt-3">
                Lists checked: {Object.entries(result.list_versions).map(([k, v]) => `${k} (${v || "N/A"})`).join(", ")}
              </p>
            </div>
          )}

          {/* Match cards */}
          {result.matches.map((match, i) => (
            <div key={i} className={`bg-white rounded-xl border p-5 mb-3 ${
              match.confidence >= 85 ? "border-red-300" : match.confidence >= 60 ? "border-amber-300" : "border-gray-200"
            }`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{match.entry.primary_name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {match.entry.entry_type} &middot; {match.list.replace("_", " ").toUpperCase()} &middot; ID: {match.entry.sdn_id}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {match.requires_review && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded border border-amber-200">
                      Needs Review
                    </span>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${BAND_COLORS[match.band]}`}>
                    {match.confidence}% &middot; {match.band}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                {match.entry.aliases.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase">Aliases</span>
                    <p className="text-gray-700 mt-0.5">{match.entry.aliases.join(", ")}</p>
                  </div>
                )}
                {match.entry.programs.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-gray-400 uppercase">Programs</span>
                    <p className="text-gray-700 mt-0.5">{match.entry.programs.join(", ")}</p>
                  </div>
                )}
                {match.entry.remarks && (
                  <div className="col-span-2">
                    <span className="text-xs font-medium text-gray-400 uppercase">Remarks</span>
                    <p className="text-gray-600 mt-0.5 text-xs">{match.entry.remarks}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
