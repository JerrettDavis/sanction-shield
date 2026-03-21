"use client";

import { useState, useRef } from "react";

interface BatchJob {
  batch_id: string;
  status: string;
  total_names: number;
  processed: number;
  matches_found: number;
  progress_pct: number;
  completed_at?: string;
  results_url?: string;
  summary?: { total: number; processed: number; matches: number; clean: number };
}

export default function BatchPage() {
  const [file, setFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(80);
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<BatchJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setJob(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("threshold", String(threshold));

    try {
      const res = await fetch("/api/v1/batch", {
        method: "POST",
        headers: { Authorization: "Bearer sk_test_localdevelopment" },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || `Error: ${res.status}`);
      }

      const data: BatchJob = await res.json();
      setJob(data);
      startPolling(data.batch_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  function startPolling(batchId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/batch/${batchId}`, {
          headers: { Authorization: "Bearer sk_test_localdevelopment" },
        });
        if (res.ok) {
          const data: BatchJob = await res.json();
          setJob(data);
          if (data.status === "complete" || data.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        }
      } catch { /* ignore polling errors */ }
    }, 2000);
  }

  function handleDownload() {
    if (!job) return;
    window.open(`/api/v1/batch/${job.batch_id}/download?format=csv`, "_blank");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Batch Screening</h1>
        <p className="text-sm text-gray-500 mt-1">Upload a CSV of names to screen against sanctions lists</p>
      </div>

      {/* Upload form */}
      <form onSubmit={handleUpload} className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-emerald-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              {file ? (
                <p className="text-sm text-gray-700">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
              ) : (
                <p className="text-sm text-gray-400">Click to select a CSV file (max 5,000 rows)</p>
              )}
            </div>
          </div>
          <div className="w-28">
            <label className="block text-sm font-medium text-gray-700 mb-1">Threshold</label>
            <input
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
            disabled={loading || !file}
            className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Uploading..." : "Upload & Screen"}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">CSV must have a &quot;name&quot; column. Optional: &quot;entity_type&quot; column.</p>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Job status */}
      {job && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Batch Job</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              job.status === "complete" ? "bg-green-100 text-green-800" :
              job.status === "failed" ? "bg-red-100 text-red-800" :
              "bg-blue-100 text-blue-800"
            }`}>
              {job.status.toUpperCase()}
            </span>
          </div>

          {/* Progress bar */}
          {job.status === "processing" && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{job.processed} / {job.total_names} names</span>
                <span>{job.progress_pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${job.progress_pct}%` }}
                />
              </div>
            </div>
          )}

          {/* Complete summary */}
          {job.status === "complete" && job.summary && (
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{job.summary.total}</div>
                <div className="text-xs text-gray-500 mt-1">Total</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{job.summary.clean}</div>
                <div className="text-xs text-green-600 mt-1">Clear</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-700">{job.summary.matches}</div>
                <div className="text-xs text-red-600 mt-1">Matches</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <button
                  onClick={handleDownload}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                >
                  Download CSV
                </button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 font-mono">ID: {job.batch_id}</p>
        </div>
      )}

      {/* Empty state */}
      {!job && !error && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No batch jobs yet</p>
          <p className="text-sm mt-1">Upload a CSV to get started</p>
        </div>
      )}
    </div>
  );
}
