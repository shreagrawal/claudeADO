import { useState } from "react";
import { getWorkItemsBatch, bulkUpdateWorkItems, getWorkItem, getChildren } from "../api";
import type { WorkItem } from "../types";

interface Props { onToast: (msg: string, type: "success" | "error" | "info") => void }

const STATES = ["", "New", "Active", "Resolved", "Closed", "Removed"];

const TYPE_COLORS: Record<string, string> = {
  "Feature":              "bg-purple-100 text-purple-700",
  "Product Backlog Item": "bg-blue-100 text-blue-700",
  "Task":                 "bg-green-100 text-green-700",
  "Epic":                 "bg-orange-100 text-orange-700",
};

export default function BulkUpdateItems({ onToast }: Props) {
  const [mode, setMode]             = useState<"ids" | "children">("ids");

  // Manual IDs mode
  const [idsInput, setIdsInput]     = useState("");

  // Load from parent mode
  const [sourceParentId, setSourceParentId]     = useState("");
  const [sourceParent, setSourceParent]         = useState<WorkItem | null>(null);
  const [childItems, setChildItems]             = useState<WorkItem[]>([]);
  const [selectedIds, setSelectedIds]           = useState<Set<number>>(new Set());
  const [loadingChildren, setLoadingChildren]   = useState(false);

  // Shared state
  const [items, setItems]           = useState<WorkItem[]>([]);
  const [fetching, setFetching]     = useState(false);
  const [applying, setApplying]     = useState(false);
  const [results, setResults]       = useState<Record<string, boolean> | null>(null);
  const [errors, setErrors]         = useState<Record<string, string>>({});

  // Fields to apply
  const [state, setState]           = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [areaPath, setAreaPath]     = useState("");
  const [iterPath, setIterPath]     = useState("");
  const [tags, setTags]             = useState("");

  // Reparent
  const [parentId, setParentId]             = useState("");
  const [parentItem, setParentItem]         = useState<WorkItem | null>(null);
  const [fetchingParent, setFetchingParent] = useState(false);

  const parsedIds = idsInput
    .split(/[\s,]+/)
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n) && n > 0);

  const hasChanges = state || assignedTo || areaPath || iterPath || tags || (parentId && parentItem);
  const allSelected = childItems.length > 0 && selectedIds.size === childItems.length;

  // ── Load children from a parent ──────────────────────────────
  const handleLoadChildren = async () => {
    const id = parseInt(sourceParentId);
    if (!id) { onToast("Enter a valid parent ID", "error"); return; }
    setLoadingChildren(true);
    setSourceParent(null); setChildItems([]); setSelectedIds(new Set());
    setItems([]); setResults(null); setErrors({});
    try {
      const data = await getChildren(id);
      setSourceParent(data.parent as WorkItem);
      setChildItems(data.children);
      if (!data.children.length) {
        onToast("No child items found under this work item", "info");
      } else {
        setSelectedIds(new Set(data.children.map(c => c.id)));
      }
    } catch (e: any) {
      onToast(e.response?.data?.detail || "Failed to load children", "error");
    } finally {
      setLoadingChildren(false);
    }
  };

  const toggleSelectAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(childItems.map(c => c.id)));

  const toggleItem = (id: number) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleUseSelected = () => {
    const selected = childItems.filter(c => selectedIds.has(c.id));
    if (!selected.length) { onToast("Select at least one item", "error"); return; }
    setItems(selected);
    setResults(null); setErrors({});
  };

  // ── Fetch items (manual IDs mode) ────────────────────────────
  const handleFetch = async () => {
    if (!parsedIds.length) { onToast("Enter at least one valid ID", "error"); return; }
    setFetching(true); setItems([]); setResults(null); setErrors({});
    try {
      const data = await getWorkItemsBatch(parsedIds);
      setItems(data);
      if (!data.length) onToast("No items found for the given IDs", "error");
    } catch (e: any) {
      onToast(e.response?.data?.detail || "Failed to fetch items", "error");
    } finally {
      setFetching(false);
    }
  };

  // ── Look up new parent ────────────────────────────────────────
  const handleLookupParent = async () => {
    const id = parseInt(parentId);
    if (!id) { onToast("Enter a valid parent ID", "error"); return; }
    setFetchingParent(true); setParentItem(null);
    try {
      setParentItem(await getWorkItem(id));
    } catch (e: any) {
      onToast(e.response?.data?.detail || `Work item #${id} not found`, "error");
    } finally {
      setFetchingParent(false);
    }
  };

  // ── Apply all changes ─────────────────────────────────────────
  const handleApply = async () => {
    if (!items.length) { onToast("Select items first", "error"); return; }
    if (!hasChanges)   { onToast("Enter at least one field to update", "error"); return; }
    setApplying(true);
    try {
      const r = await bulkUpdateWorkItems({
        ids:            items.map(i => i.id),
        state:          state      || undefined,
        assigned_to:    assignedTo || undefined,
        area_path:      areaPath   || undefined,
        iteration_path: iterPath   || undefined,
        tags:           tags       || undefined,
        parent_id:      parentItem ? parseInt(parentId) : undefined,
      });
      setResults(r.results);
      setErrors(r.errors || {});
      const success = Object.values(r.results).filter(Boolean).length;
      const failed  = items.length - success;
      onToast(
        failed === 0
          ? `Updated ${success} item${success !== 1 ? "s" : ""}`
          : `Updated ${success}, failed ${failed}`,
        failed === 0 ? "success" : "error",
      );
    } catch (e: any) {
      onToast(e.response?.data?.detail || "Bulk update failed", "error");
    } finally {
      setApplying(false);
    }
  };

  const reset = () => {
    setIdsInput(""); setItems([]); setResults(null); setErrors({});
    setState(""); setAssignedTo(""); setAreaPath(""); setIterPath(""); setTags("");
    setParentId(""); setParentItem(null);
    setSourceParentId(""); setSourceParent(null); setChildItems([]); setSelectedIds(new Set());
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Update</h1>
        <p className="text-gray-500 text-sm mt-1">Update fields or reparent multiple work items at once.</p>
      </div>

      {/* ── Step 1 ─────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Step 1</span>
          <h2 className="font-semibold text-gray-800">Select Items</h2>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(["ids", "children"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setItems([]); setResults(null); setErrors({}); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
                ${mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {m === "ids" ? "Enter IDs" : "Load from Parent"}
            </button>
          ))}
        </div>

        {/* Enter IDs mode */}
        {mode === "ids" && (
          <div className="space-y-3">
            <textarea
              className="form-input h-24 resize-none font-mono"
              placeholder={"Comma or newline separated IDs\ne.g. 12345, 12346, 12347"}
              value={idsInput}
              onChange={e => { setIdsInput(e.target.value); setItems([]); setResults(null); setErrors({}); }}
            />
            {parsedIds.length > 0 && (
              <p className="text-xs text-gray-500">{parsedIds.length} ID{parsedIds.length !== 1 ? "s" : ""} detected</p>
            )}
            <button className="btn-primary" onClick={handleFetch} disabled={fetching || !parsedIds.length}>
              {fetching ? "Fetching..." : "Preview Items"}
            </button>
          </div>
        )}

        {/* Load from parent mode */}
        {mode === "children" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="number"
                className="form-input max-w-xs"
                placeholder="Feature or PBI work item ID"
                value={sourceParentId}
                onChange={e => { setSourceParentId(e.target.value); setSourceParent(null); setChildItems([]); setSelectedIds(new Set()); setItems([]); }}
                onKeyDown={e => e.key === "Enter" && handleLoadChildren()}
              />
              <button className="btn-primary" onClick={handleLoadChildren} disabled={loadingChildren || !sourceParentId}>
                {loadingChildren ? "Loading..." : "Load Children"}
              </button>
            </div>

            {/* Source parent info */}
            {sourceParent && (
              <div className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${TYPE_COLORS[sourceParent.type] || "bg-gray-100 text-gray-600"}`}>
                  {sourceParent.type}
                </span>
                <span className="font-mono text-gray-400">#{sourceParent.id}</span>
                <span className="font-medium text-gray-800">{sourceParent.title}</span>
                <span className="text-xs text-gray-400 ml-auto">{childItems.length} child{childItems.length !== 1 ? "ren" : ""}</span>
              </div>
            )}

            {/* Children table with checkboxes */}
            {childItems.length > 0 && (
              <div className="space-y-2">
                <div className="overflow-auto rounded-md border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 w-10">
                          <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" />
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">State</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {childItems.map(child => (
                        <tr
                          key={child.id}
                          className={`cursor-pointer transition-colors ${selectedIds.has(child.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}
                          onClick={() => toggleItem(child.id)}
                        >
                          <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(child.id)}
                              onChange={() => toggleItem(child.id)}
                              className="rounded"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-600">{child.id}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${TYPE_COLORS[child.type] || "bg-gray-100 text-gray-600"}`}>
                              {child.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-800 max-w-xs truncate">{child.title}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{child.state}</td>
                          <td className="px-3 py-2 text-gray-400 text-xs truncate max-w-[120px]">{child.assigned_to || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {selectedIds.size} of {childItems.length} selected
                  </span>
                  <button className="btn-primary" onClick={handleUseSelected} disabled={!selectedIds.size}>
                    Use {selectedIds.size} Selected →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Step 2 — Preview ───────────────────────────────────── */}
      {items.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Step 2</span>
            <h2 className="font-semibold text-gray-800">Preview ({items.length} item{items.length !== 1 ? "s" : ""})</h2>
          </div>
          <div className="overflow-auto rounded-md border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">State</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Current Parent</th>
                  {results && <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Result</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => {
                  const ok = results?.[String(item.id)];
                  return (
                    <tr key={item.id} className={results ? (ok ? "bg-green-50" : "bg-red-50") : "hover:bg-gray-50"}>
                      <td className="px-3 py-2 font-mono text-gray-600">{item.id}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${TYPE_COLORS[item.type] || "bg-gray-100 text-gray-600"}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-800 max-w-xs truncate">{item.title}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{item.state}</td>
                      <td className="px-3 py-2 text-xs">
                        {item.parent_id
                          ? <span className="font-mono text-blue-600">#{item.parent_id}</span>
                          : <span className="text-gray-400">—</span>
                        }
                      </td>
                      {results && (
                        <td className="px-3 py-2 text-xs">
                          {ok
                            ? <span className="text-green-600 font-medium">✓ updated</span>
                            : <span className="text-red-600 font-medium">
                                ✕ failed
                                {errors[String(item.id)] && (
                                  <span className="block text-red-400 font-normal mt-0.5 max-w-xs break-words">
                                    {errors[String(item.id)]}
                                  </span>
                                )}
                              </span>
                          }
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Step 3 — Changes to Apply ──────────────────────────── */}
      {items.length > 0 && (
        <div className="card space-y-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Step 3</span>
            <h2 className="font-semibold text-gray-800">Changes to Apply</h2>
            <span className="text-xs text-gray-400">(leave blank to skip that field)</span>
          </div>

          {/* General fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">State</label>
              <select className="form-input" value={state} onChange={e => setState(e.target.value)}>
                <option value="">— no change —</option>
                {STATES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Assigned To</label>
              <input className="form-input" placeholder="user@company.com" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Area Path</label>
              <input className="form-input" placeholder="e.g. One\YourTeam\Area" value={areaPath} onChange={e => setAreaPath(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Iteration Path</label>
              <input className="form-input" placeholder="e.g. One\Sprint\CY26Q1" value={iterPath} onChange={e => setIterPath(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">
                Tags
                <span className="text-xs text-gray-400 font-normal ml-1">(replaces existing; semicolon-separated)</span>
              </label>
              <input className="form-input" placeholder="e.g. claudeADO; sprint-42" value={tags} onChange={e => setTags(e.target.value)} />
            </div>
          </div>

          {/* Reparent section */}
          <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-amber-800">Reparent Items</span>
              <span className="text-xs text-amber-600">Move all selected items under a new parent</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                className="form-input flex-1"
                placeholder="New parent work item ID (Feature or PBI)"
                value={parentId}
                onChange={e => { setParentId(e.target.value); setParentItem(null); }}
                onKeyDown={e => e.key === "Enter" && handleLookupParent()}
              />
              <button className="btn-secondary whitespace-nowrap" onClick={handleLookupParent} disabled={fetchingParent || !parentId}>
                {fetchingParent ? "Looking up..." : "Look up"}
              </button>
            </div>

            {parentItem && (
              <div className="bg-white border border-amber-200 rounded-md p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${TYPE_COLORS[parentItem.type] || "bg-gray-100 text-gray-600"}`}>
                    {parentItem.type}
                  </span>
                  <span className="font-mono text-gray-500">#{parentItem.id}</span>
                  <span className="font-medium text-gray-800 truncate">{parentItem.title}</span>
                  <span className="text-xs text-gray-400">({parentItem.state})</span>
                </div>
                <p className="text-xs text-amber-700">
                  ⬆ {items.length} item{items.length !== 1 ? "s" : ""} will be moved under this parent
                  {items.some(i => i.parent_id) && (
                    <span className="ml-1">(existing parent links will be replaced)</span>
                  )}
                </p>
              </div>
            )}
            {!parentItem && parentId && (
              <p className="text-xs text-amber-600">Click "Look up" to verify the parent before applying.</p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <button className="btn-primary" onClick={handleApply} disabled={applying || !hasChanges}>
              {applying ? "Applying..." : `Apply to ${items.length} item${items.length !== 1 ? "s" : ""}`}
            </button>
            <button className="btn-secondary" onClick={reset}>Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}
