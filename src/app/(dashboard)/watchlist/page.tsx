"use client";

import { useState } from "react";

interface WatchlistEntry {
  id: string;
  name: string;
  entity_type: string;
  last_screened_at: string | null;
  created_at: string;
}

export default function WatchlistPage() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("any");


  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    // Local-only for now — will wire to API in next phase
    const entry: WatchlistEntry = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      entity_type: newType,
      last_screened_at: null,
      created_at: new Date().toISOString(),
    };
    setEntries(prev => [...prev, entry]);
    setNewName("");
  }

  function handleRemove(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Watchlist</h1>
        <p className="text-sm text-gray-500 mt-1">
          Names monitored for automatic re-screening when sanctions lists update
        </p>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name to monitor</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. ACME Trading Co."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={newType}
              onChange={e => setNewType(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="any">Any</option>
              <option value="individual">Individual</option>
              <option value="organization">Organization</option>
              <option value="vessel">Vessel</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={!newName.trim()}
            className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            Add to Watchlist
          </button>
        </div>
      </form>

      {/* Entries table */}
      {entries.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Last Screened</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{entry.name}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{entry.entity_type}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {entry.last_screened_at ? new Date(entry.last_screened_at).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(entry.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRemove(entry.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No names on watchlist</p>
          <p className="text-sm mt-1">Add names above to monitor them for sanctions list changes</p>
        </div>
      )}
    </div>
  );
}
