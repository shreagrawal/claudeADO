import { useState } from "react";
import { getWorkItem, updateWorkItem } from "../api";
import type { WorkItem } from "../types";

interface Props { onToast: (msg: string, type: "success" | "error") => void }

const STATES = ["New", "Active", "Resolved", "Closed", "Removed"];

export default function UpdateItem({ onToast }: Props) {
  const [itemId, setItemId]   = useState("");
  const [item, setItem]       = useState<WorkItem | null>(null);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState<Partial<WorkItem>>({});

  const handleFetch = async () => {
    const id = parseInt(itemId);
    if (!id) { onToast("Enter a valid ID", "error"); return; }
    setFetching(true);
    setItem(null);
    try {
      const w = await getWorkItem(id);
      setItem(w);
      setForm({ title: w.title, state: w.state, assigned_to: w.assigned_to, area_path: w.area_path, iteration_path: w.iteration_path });
    } catch (e: any) {
      onToast(e.response?.data?.detail || `Work item ${id} not found`, "error");
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      const changes: any = {};
      if (form.title !== item.title) changes.title = form.title;
      if (form.state !== item.state) changes.state = form.state;
      if (form.assigned_to !== item.assigned_to) changes.assigned_to = form.assigned_to;
      if (form.area_path !== item.area_path) changes.area_path = form.area_path;
      if (form.iteration_path !== item.iteration_path) changes.iteration_path = form.iteration_path;
      if (!Object.keys(changes).length) { onToast("No changes to save", "info" as any); return; }
      await updateWorkItem(item.id, changes);
      onToast(`Work item #${item.id} updated`, "success");
      setItem(prev => prev ? { ...prev, ...form as WorkItem } : null);
    } catch (e: any) {
      onToast(e.response?.data?.detail || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof WorkItem, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Update Work Item</h1>
        <p className="text-gray-500 text-sm mt-1">Fetch a work item by ID then edit its fields.</p>
      </div>

      {/* Fetch */}
      <div className="card">
        <label className="form-label">Work Item ID</label>
        <div className="flex gap-3 mt-1">
          <input
            type="number"
            className="form-input max-w-xs"
            placeholder="e.g. 36917837"
            value={itemId}
            onChange={e => setItemId(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleFetch()}
          />
          <button className="btn-primary" onClick={handleFetch} disabled={fetching}>
            {fetching ? "Fetching..." : "Fetch"}
          </button>
        </div>
      </div>

      {/* Edit form */}
      {item && (
        <div className="card space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
            <span className="text-xs font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              {item.type}
            </span>
            <span className="text-gray-400 text-sm">#{item.id}</span>
          </div>

          <div>
            <label className="form-label">Title</label>
            <input className="form-input" value={form.title || ""} onChange={e => set("title", e.target.value)} />
          </div>

          <div>
            <label className="form-label">State</label>
            <select className="form-input" value={form.state || ""} onChange={e => set("state", e.target.value)}>
              {STATES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              ["Assigned To", "assigned_to"],
              ["Area Path", "area_path"],
              ["Iteration Path", "iteration_path"],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="form-label">{label}</label>
                <input className="form-input" value={form[key as keyof typeof form] as string || ""} onChange={e => set(key as keyof WorkItem, e.target.value)} />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button className="btn-secondary" onClick={() => { setItem(null); setItemId(""); }}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
