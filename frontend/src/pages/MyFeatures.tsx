import { useState, useEffect } from "react";
import { getFeatures } from "../api";
import type { Feature } from "../types";

interface Props { onToast: (msg: string, type: "success" | "error") => void }

const STATE_COLORS: Record<string, string> = {
  "Active":      "bg-blue-100 text-blue-700",
  "New":         "bg-gray-100 text-gray-700",
  "Resolved":    "bg-purple-100 text-purple-700",
  "Closed":      "bg-green-100 text-green-700",
  "Removed":     "bg-red-100 text-red-700",
};

function stateBadge(state: string) {
  const cls = STATE_COLORS[state] ?? "bg-gray-100 text-gray-600";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{state || "—"}</span>;
}

export default function MyFeatures({ onToast }: Props) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getFeatures();
      setFeatures(data);
    } catch (e: any) {
      onToast(e.response?.data?.detail || "Failed to load features", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Features</h1>
          <p className="text-gray-500 text-sm mt-1">
            All Features created by claudeADO (tagged <code className="bg-gray-100 px-1 rounded text-xs">claudeADO</code>).
          </p>
        </div>
        <button className="btn-secondary text-sm" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loading && features.length === 0 && (
        <div className="card text-center text-gray-500 py-12">Loading features...</div>
      )}

      {!loading && features.length === 0 && (
        <div className="card text-center text-gray-500 py-12">
          No features found. Create a Feature using this app and it will appear here.
        </div>
      )}

      {features.length > 0 && (
        <div className="space-y-3">
          {features.map(f => (
            <div key={f.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-gray-400">#{f.id}</span>
                    {stateBadge(f.state)}
                    <span className="text-xs text-gray-400">{f.created_date}</span>
                  </div>
                  <div className="font-semibold text-gray-900 mt-1 truncate">{f.title}</div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                    {f.assigned_to && <span>Assigned: {f.assigned_to}</span>}
                    {f.area_path   && <span>Area: {f.area_path}</span>}
                    {f.iteration_path && <span>Sprint: {f.iteration_path.split("\\").pop()}</span>}
                  </div>
                </div>
                <a
                  href={f.ado_url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-xs whitespace-nowrap"
                >
                  Open in ADO →
                </a>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 text-right">{features.length} feature{features.length !== 1 ? "s" : ""} found</p>
        </div>
      )}
    </div>
  );
}
