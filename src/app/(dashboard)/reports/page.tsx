"use client";

import { useState } from "react";

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [generating, setGenerating] = useState(false);

  function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    // Will wire to API — for now just simulate
    setTimeout(() => setGenerating(false), 1500);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Compliance Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate audit-ready reports of all screening activity
        </p>
      </div>

      {/* Report generator */}
      <form onSubmit={handleGenerate} className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <h3 className="font-medium text-gray-900 mb-4">Generate Screening Report</h3>
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={generating}
            className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {generating ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </form>

      {/* Report info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-3">What&apos;s included</h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">&#10003;</span>
            Every screening request with timestamp and initiating user/API key
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">&#10003;</span>
            Match results with confidence scores and sanctions list versions
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">&#10003;</span>
            False positive resolutions with reviewer and resolution date
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">&#10003;</span>
            Sanctions list update history during the report period
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5">&#10003;</span>
            Available as CSV or PDF download
          </li>
        </ul>
      </div>

      {/* Empty state */}
      <div className="text-center py-12 text-gray-400">
        <p className="text-sm">Previous reports will appear here once generated</p>
      </div>
    </div>
  );
}
