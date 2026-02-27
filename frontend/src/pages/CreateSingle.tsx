import { useState, useEffect } from "react";
import { createSingle, getConfig } from "../api";

interface Props { onToast: (msg: string, type: "success" | "error") => void }

const WIT_TYPES = ["Feature", "Product Backlog Item", "Task"];
export default function CreateSingle({ onToast }: Props) {
  const [form, setForm] = useState({
    wit_type: "Product Backlog Item", title: "", description: "",
    assigned_to: "", area_path: "", iteration_path: "",
    effort: "", parent_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<{ id: number; ado_url: string } | null>(null);

  useEffect(() => {
    getConfig().then(cfg => {
      setForm(f => ({
        ...f,
        assigned_to: cfg.assigned_to || "",
        area_path: cfg.area_path || "",
        iteration_path: cfg.iteration_path || "",
      }));
    }).catch(() => {});
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.title.trim()) { onToast("Title is required", "error"); return; }
    setLoading(true);
    try {
      const payload: any = {
        wit_type: form.wit_type, title: form.title.trim(),
        description: form.description,
        assigned_to: form.assigned_to, area_path: form.area_path,
        iteration_path: form.iteration_path,
      };
      if (form.effort) payload.effort = parseInt(form.effort);
      if (form.parent_id) payload.parent_id = parseInt(form.parent_id);
      const r = await createSingle(payload);
      setResult({ id: r.id, ado_url: r.ado_url });
      onToast(`Created ${form.wit_type} #${r.id}`, "success");
    } catch (e: any) {
      onToast(e.response?.data?.detail || "Failed to create", "error");
    } finally {
      setLoading(false);
    }
  };

  if (result) return (
    <div className="max-w-2xl">
      <div className="card border-green-200 bg-green-50 space-y-4">
        <div className="font-bold text-green-700 text-lg">Work item created!</div>
        <div className="flex gap-3">
          <a href={result.ado_url} target="_blank" rel="noreferrer" className="btn-primary text-sm">
            View #{result.id} in ADO →
          </a>
          <button className="btn-secondary text-sm" onClick={() => setResult(null)}>Create another</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Single Item</h1>
        <p className="text-gray-500 text-sm mt-1">Create one work item manually with full control over all fields.</p>
      </div>

      <div className="card space-y-4">
        {/* Type */}
        <div>
          <label className="form-label">Work Item Type</label>
          <div className="flex gap-2">
            {WIT_TYPES.map(t => (
              <button
                key={t}
                onClick={() => set("wit_type", t)}
                className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                  form.wit_type === t
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="form-label">Title <span className="text-red-500">*</span></label>
          <input className="form-input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Enter title" />
        </div>

        {/* Description */}
        <div>
          <label className="form-label">Description</label>
          <textarea className="form-input h-24 resize-none" value={form.description} onChange={e => set("description", e.target.value)} placeholder="Optional description" />
        </div>

        {/* Effort (Task only) */}
        {form.wit_type === "Task" && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Effort (days)</label>
              <input type="number" className="form-input" min={1} max={30} value={form.effort} onChange={e => set("effort", e.target.value)} placeholder="e.g. 2" />
            </div>
            <div>
              <label className="form-label">Parent PBI ID</label>
              <input type="number" className="form-input" value={form.parent_id} onChange={e => set("parent_id", e.target.value)} placeholder="e.g. 12345" />
            </div>
          </div>
        )}

        {/* Parent for PBI */}
        {form.wit_type === "Product Backlog Item" && (
          <div>
            <label className="form-label">Parent Feature ID</label>
            <input type="number" className="form-input" value={form.parent_id} onChange={e => set("parent_id", e.target.value)} placeholder="e.g. 12345 (optional)" />
          </div>
        )}

        {/* ADO fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
          {[
            ["Assigned To", "assigned_to"],
            ["Area Path", "area_path"],
            ["Iteration Path", "iteration_path"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="form-label">{label}</label>
              <input className="form-input" value={form[key as keyof typeof form]} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Work Item"}
          </button>
        </div>
      </div>
    </div>
  );
}
