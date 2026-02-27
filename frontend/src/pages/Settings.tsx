import { useState, useEffect } from "react";
import { getConfig, saveConfig } from "../api";
import type { Config } from "../types";

interface Props { onToast: (msg: string, type: "success" | "error") => void }

const FIELDS: { key: keyof Config; label: string; placeholder: string; required?: boolean }[] = [
  { key: "ado_org_url",    label: "ADO Organisation URL",   placeholder: "https://msazure.visualstudio.com", required: true },
  { key: "ado_project",    label: "ADO Project",            placeholder: "One", required: true },
  { key: "assigned_to",    label: "Default Assignee Email", placeholder: "user@microsoft.com", required: true },
  { key: "area_path",      label: "Default Area Path",      placeholder: "One\\Team\\SubTeam" },
  { key: "iteration_path", label: "Default Iteration Path", placeholder: "One\\Sprint1" },
  { key: "azureauth_path", label: "AzureAuth.exe Path",     placeholder: "C:\\...\\azureauth.exe" },
];

export default function Settings({ onToast }: Props) {
  const [form, setForm]     = useState<Config>({
    ado_org_url: "", ado_project: "", assigned_to: "",
    area_path: "", iteration_path: "", azureauth_path: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    getConfig().then(cfg => {
      setForm({
        ado_org_url:    cfg.ado_org_url    || "",
        ado_project:    cfg.ado_project    || "",
        assigned_to:    cfg.assigned_to    || "",
        area_path:      cfg.area_path      || "",
        iteration_path: cfg.iteration_path || "",
        azureauth_path: cfg.azureauth_path || "",
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = (k: keyof Config, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.ado_org_url || !form.ado_project || !form.assigned_to) {
      onToast("Organisation URL, Project and Assignee are required", "error"); return;
    }
    setSaving(true);
    try {
      await saveConfig(form);
      onToast("Settings saved", "success");
    } catch (e: any) {
      onToast(e.response?.data?.detail || "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure your ADO connection. Settings are saved to <code className="bg-gray-100 px-1 rounded">config.json</code> on the server.
        </p>
      </div>

      <div className="card space-y-5">
        {FIELDS.map(({ key, label, placeholder, required }) => (
          <div key={key}>
            <label className="form-label">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              className="form-input"
              value={form[key]}
              placeholder={placeholder}
              onChange={e => set(key, e.target.value)}
            />
          </div>
        ))}

        <div className="pt-2 border-t border-gray-100 flex justify-end">
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>Authentication:</strong> Uses AzureAuth broker mode with your Windows corporate identity — no PAT token required.
        Falls back to PAT prompt if AzureAuth is unavailable.
      </div>
    </div>
  );
}
