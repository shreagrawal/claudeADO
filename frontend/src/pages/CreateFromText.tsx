import { useState } from "react";
import { parseText, createHierarchy, getConfig } from "../api";
import HierarchyTree from "../components/HierarchyTree";
import type { Hierarchy, Config } from "../types";

interface Props { onToast: (msg: string, type: "success" | "error") => void }

export default function CreateFromText({ onToast }: Props) {
  const [text, setText]             = useState("");
  const [hierarchy, setHierarchy]   = useState<Hierarchy | null>(null);
  const [parsing, setParsing]       = useState(false);
  const [creating, setCreating]     = useState(false);
  const [result, setResult]         = useState<{ feature_id: number; feature_url: string; pbi_count: number; task_count: number } | null>(null);
  const [epicId, setEpicId]         = useState("");
  const [overrides, setOverrides]   = useState<Pick<Config, "assigned_to" | "area_path" | "iteration_path">>({
    assigned_to: "", area_path: "", iteration_path: "",
  });
  const [showOverrides, setShowOverrides] = useState(false);

  const handleParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setHierarchy(null);
    setResult(null);
    try {
      const cfg = await getConfig();
      setOverrides({
        assigned_to: cfg.assigned_to || "",
        area_path: cfg.area_path || "",
        iteration_path: cfg.iteration_path || "",
      });
      const h = await parseText(text);
      setHierarchy(h);
    } catch (e: any) {
      onToast(e.response?.data?.detail || "Failed to parse text", "error");
    } finally {
      setParsing(false);
    }
  };

  const handleCreate = async () => {
    if (!hierarchy) return;
    setCreating(true);
    try {
      const r = await createHierarchy(
        hierarchy,
        overrides.assigned_to,
        overrides.area_path,
        overrides.iteration_path,
        epicId ? parseInt(epicId) : undefined,
      );
      setResult(r);
      onToast(`Created Feature #${r.feature_id} with ${r.pbi_count} PBIs and ${r.task_count} tasks`, "success");
    } catch (e: any) {
      onToast(e.response?.data?.detail || "Failed to create work items", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleReset = () => {
    setText(""); setHierarchy(null); setResult(null); setEpicId("");
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create from Text</h1>
        <p className="text-gray-500 text-sm mt-1">
          Paste a project plan — Claude AI will parse it into a Feature, PBIs and Tasks, ready to create in ADO.
        </p>
      </div>

      {/* Text input */}
      {!hierarchy && !result && (
        <div className="card space-y-4">
          <label className="form-label">Project Plan</label>
          <textarea
            className="form-input h-52 font-mono text-sm resize-none"
            placeholder={"Paste your project plan here...\n\nExample:\nBuild a REST API backend.\n- Set up project and CI pipeline\n- Implement endpoints\n- Add authentication"}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              className="btn-primary flex items-center gap-2"
              onClick={handleParse}
              disabled={!text.trim() || parsing}
            >
              {parsing ? (
                <><span className="animate-spin">⟳</span> Parsing with Claude...</>
              ) : (
                "Parse with Claude →"
              )}
            </button>
          </div>
        </div>
      )}

      {/* Hierarchy preview */}
      {hierarchy && !result && (
        <>
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Parsed Hierarchy</h2>
              <button className="btn-secondary text-sm" onClick={handleReset}>Start over</button>
            </div>
            <HierarchyTree hierarchy={hierarchy} />
          </div>

          {/* Epic parent */}
          <div className="card space-y-2">
            <label className="form-label">
              Parent Epic ID <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              className="form-input max-w-xs"
              placeholder="e.g. 12345 — leave blank if none"
              value={epicId}
              onChange={e => setEpicId(e.target.value)}
            />
            <p className="text-xs text-gray-400">The Feature will be linked as a child of this Epic in ADO.</p>
          </div>

          {/* Overrides */}
          <div className="card space-y-4">
            <button
              className="flex items-center gap-2 text-sm font-medium text-gray-700 w-full text-left"
              onClick={() => setShowOverrides(v => !v)}
            >
              <span>{showOverrides ? "▲" : "▼"}</span>
              ADO Settings {showOverrides ? "(click to hide)" : "(click to override defaults)"}
            </button>
            {showOverrides && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  ["Assigned To", "assigned_to"],
                  ["Area Path", "area_path"],
                  ["Iteration Path", "iteration_path"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className="form-label">{label}</label>
                    <input
                      className="form-input"
                      value={overrides[key as keyof typeof overrides]}
                      onChange={e => setOverrides(o => ({ ...o, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={handleReset}>Back</button>
            <button
              className="btn-primary flex items-center gap-2"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <><span className="animate-spin">⟳</span> Creating in ADO...</>
              ) : (
                "Create in ADO"
              )}
            </button>
          </div>
        </>
      )}

      {/* Success result */}
      {result && (
        <div className="card border-green-200 bg-green-50 space-y-4">
          <div className="flex items-center gap-2 text-green-700">
            <span className="text-2xl">✓</span>
            <div>
              <div className="font-bold text-lg">Work items created successfully!</div>
              <div className="text-sm text-green-600">
                1 Feature · {result.pbi_count} PBIs · {result.task_count} Tasks
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={result.feature_url}
              target="_blank"
              rel="noreferrer"
              className="btn-primary text-sm"
            >
              View Feature #{result.feature_id} in ADO →
            </a>
            <button className="btn-secondary text-sm" onClick={handleReset}>
              Create another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
