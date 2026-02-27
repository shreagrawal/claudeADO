import { useState } from "react";
import type { Hierarchy } from "../types";

interface Props { hierarchy: Hierarchy }

export default function HierarchyTree({ hierarchy }: Props) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toggle = (i: number) => setExpanded(e => ({ ...e, [i]: !e[i] }));

  const totalTasks  = hierarchy.pbis.reduce((s, p) => s + p.tasks.length, 0);
  const totalEffort = hierarchy.pbis.reduce(
    (s, p) => s + p.tasks.reduce((ts, t) => ts + (t.effort ?? 0), 0), 0
  );

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded">
          1 Feature
        </span>
        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
          {hierarchy.pbis.length} PBIs
        </span>
        <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded">
          {totalTasks} Tasks
        </span>
        <span className="bg-gray-50 text-gray-600 border border-gray-200 px-2 py-0.5 rounded">
          ~{totalEffort} days
        </span>
      </div>

      {/* Feature */}
      <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <span className="text-yellow-600 font-bold text-xs uppercase tracking-wide bg-yellow-100 px-1.5 py-0.5 rounded mt-0.5">Feature</span>
          <div>
            <div className="font-semibold text-gray-800">{hierarchy.feature.title}</div>
            <div className="text-xs text-gray-500 mt-0.5">{hierarchy.feature.description}</div>
          </div>
        </div>
      </div>

      {/* PBIs */}
      <div className="space-y-2 pl-4 border-l-2 border-gray-200">
        {hierarchy.pbis.map((pbi, i) => (
          <div key={i} className="border border-blue-200 bg-blue-50 rounded-lg">
            <button
              onClick={() => toggle(i)}
              className="w-full flex items-start gap-2 p-3 text-left"
            >
              <span className="text-blue-600 font-bold text-xs uppercase tracking-wide bg-blue-100 px-1.5 py-0.5 rounded mt-0.5 shrink-0">PBI</span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-800 text-sm">{pbi.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{pbi.description}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">{pbi.tasks.length} tasks</span>
                <span className="text-gray-400 text-xs">{expanded[i] ? "▲" : "▼"}</span>
              </div>
            </button>

            {(expanded[i] ?? true) && (
              <div className="border-t border-blue-200 divide-y divide-blue-100">
                {pbi.tasks.map((task, j) => (
                  <div key={j} className="flex items-center gap-2 px-3 py-2 pl-10 bg-white">
                    <span className="text-green-600 font-bold text-xs uppercase tracking-wide bg-green-50 px-1.5 py-0.5 rounded shrink-0">Task</span>
                    <span className="text-sm text-gray-700 flex-1">{task.title}</span>
                    {task.effort && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                        {task.effort}d
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
