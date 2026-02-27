import { useState } from "react";
import { deleteWorkItems } from "../api";

interface Props { onToast: (msg: string, type: "success" | "error") => void }

export default function DeleteItems({ onToast }: Props) {
  const [input, setInput]       = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [results, setResults]   = useState<Record<string, boolean> | null>(null);

  const ids = input.split(/[\s,]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);

  const handleDelete = async () => {
    if (!ids.length) { onToast("Enter at least one valid ID", "error"); return; }
    setLoading(true);
    try {
      const r = await deleteWorkItems(ids);
      setResults(r.results);
      const success = Object.values(r.results).filter(Boolean).length;
      const failed  = ids.length - success;
      onToast(
        failed === 0
          ? `Deleted ${success} work item${success > 1 ? "s" : ""}`
          : `Deleted ${success}, failed ${failed}`,
        failed === 0 ? "success" : "error"
      );
    } catch (e: any) {
      onToast(e.response?.data?.detail || "Delete failed", "error");
    } finally {
      setLoading(false);
      setConfirmed(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Delete Work Items</h1>
        <p className="text-gray-500 text-sm mt-1">Enter work item IDs to delete. Items are moved to the ADO recycle bin.</p>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="form-label">Work Item IDs</label>
          <textarea
            className="form-input h-28 resize-none font-mono"
            placeholder={"Enter IDs separated by commas or new lines\ne.g. 12345, 12346, 12347"}
            value={input}
            onChange={e => { setInput(e.target.value); setConfirmed(false); setResults(null); }}
          />
          {ids.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">{ids.length} ID{ids.length > 1 ? "s" : ""} detected: {ids.join(", ")}</p>
          )}
        </div>

        {/* Confirm step */}
        {!confirmed && ids.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            <p className="text-red-700 text-sm font-medium">
              About to delete {ids.length} work item{ids.length > 1 ? "s" : ""}. This cannot be undone from the UI.
            </p>
            <button className="btn-danger text-sm" onClick={() => setConfirmed(true)}>
              Confirm Delete
            </button>
          </div>
        )}

        {confirmed && (
          <button className="btn-danger w-full" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : `Delete ${ids.length} item${ids.length > 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {/* Results */}
      {results && (
        <div className="card space-y-2">
          <h2 className="font-semibold text-gray-700">Results</h2>
          {Object.entries(results).map(([id, ok]) => (
            <div key={id} className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded ${ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              <span>{ok ? "✓" : "✕"}</span>
              <span>ID {id}</span>
              <span className="text-xs opacity-70">{ok ? "deleted" : "failed"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
