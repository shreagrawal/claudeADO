import type { Page } from "../types";

interface Props {
  current: Page;
  onChange: (p: Page) => void;
}

const items: { id: Page; label: string; icon: string }[] = [
  { id: "create-text",   label: "Create from Text",  icon: "✦" },
  { id: "create-single", label: "Create Single Item", icon: "＋" },
  { id: "update",        label: "Update Item",        icon: "✎" },
  { id: "delete",        label: "Delete Items",       icon: "✕" },
  { id: "features",      label: "My Features",        icon: "★" },
  { id: "settings",      label: "Settings",           icon: "⚙" },
];

export default function Sidebar({ current, onChange }: Props) {
  return (
    <aside className="w-56 min-h-screen bg-slate-800 text-white flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="text-blue-400 font-bold text-lg tracking-wide">claudeADO</div>
        <div className="text-slate-400 text-xs mt-0.5">ADO Work Item Manager</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition-colors text-left
              ${current === item.id
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
          >
            <span className="text-base w-4 text-center">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-700 text-slate-500 text-xs">
        Powered by Claude AI
      </div>
    </aside>
  );
}
