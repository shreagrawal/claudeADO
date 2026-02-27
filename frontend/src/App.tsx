import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import CreateFromText from "./pages/CreateFromText";
import CreateSingle from "./pages/CreateSingle";
import UpdateItem from "./pages/UpdateItem";
import DeleteItems from "./pages/DeleteItems";
import Settings from "./pages/Settings";
import MyFeatures from "./pages/MyFeatures";
import type { Page } from "./types";

interface ToastState { message: string; type: "success" | "error" | "info" }

export default function App() {
  const [page, setPage]   = useState<Page>("create-text");
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const show = (p: Page) => (page === p ? "" : "hidden");

  return (
    <div className="flex min-h-screen">
      <Sidebar current={page} onChange={setPage} />
      <main className="flex-1 p-8 overflow-auto">
        <div className={show("create-text")}><CreateFromText onToast={showToast} /></div>
        <div className={show("create-single")}><CreateSingle   onToast={showToast} /></div>
        <div className={show("update")}><UpdateItem      onToast={showToast} /></div>
        <div className={show("delete")}><DeleteItems     onToast={showToast} /></div>
        <div className={show("features")}><MyFeatures      onToast={showToast} /></div>
        <div className={show("settings")}><Settings        onToast={showToast} /></div>
      </main>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
