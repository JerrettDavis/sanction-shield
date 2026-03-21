"use client";

import { useState } from "react";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("My Organization");
  const [threshold, setThreshold] = useState(80);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      id: "dev-key",
      name: "Local Dev Key",
      prefix: "sk_test_",
      created_at: new Date().toISOString(),
      last_used_at: null,
    },
  ]);
  const [newKeyName, setNewKeyName] = useState("");
  const [showNewKey, setShowNewKey] = useState<string | null>(null);

  function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const key: ApiKey = {
      id: crypto.randomUUID(),
      name: newKeyName.trim(),
      prefix: "sk_live_" + Math.random().toString(36).slice(2, 10),
      created_at: new Date().toISOString(),
      last_used_at: null,
    };
    setApiKeys(prev => [...prev, key]);
    setShowNewKey(key.prefix + "..." + Math.random().toString(36).slice(2, 34));
    setNewKeyName("");
  }

  function handleRevokeKey(id: string) {
    setApiKeys(prev => prev.filter(k => k.id !== id));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your organization, API keys, and screening preferences</p>
      </div>

      {/* Organization */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-medium text-gray-900 mb-4">Organization</h3>
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
            Save
          </button>
        </div>
      </div>

      {/* Screening defaults */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="font-medium text-gray-900 mb-4">Screening Defaults</h3>
        <div className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Default confidence threshold
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              min={0}
              max={100}
              className="flex-1"
            />
            <span className="text-sm font-mono w-12 text-right">{threshold}%</span>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Matches below this threshold will be classified as CLEAR. Higher = fewer false positives, but may miss fuzzy matches.
          </p>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">API Keys</h3>

        {showNewKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-amber-800 mb-1">New API key created — copy it now!</p>
            <code className="text-xs bg-white px-2 py-1 rounded border border-amber-200 block overflow-x-auto">
              {showNewKey}
            </code>
            <p className="text-xs text-amber-600 mt-2">This key will only be shown once.</p>
            <button
              onClick={() => setShowNewKey(null)}
              className="mt-2 text-xs text-amber-700 hover:text-amber-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Existing keys */}
        <div className="space-y-2 mb-4">
          {apiKeys.map(key => (
            <div key={key.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-900">{key.name}</span>
                <span className="text-xs text-gray-400 ml-2 font-mono">{key.prefix}...</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {key.last_used_at ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}` : "Never used"}
                </span>
                <button
                  onClick={() => handleRevokeKey(key.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create key */}
        <form onSubmit={handleCreateKey} className="flex gap-3">
          <input
            type="text"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Production API)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button
            type="submit"
            disabled={!newKeyName.trim()}
            className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            Create Key
          </button>
        </form>
      </div>
    </div>
  );
}
