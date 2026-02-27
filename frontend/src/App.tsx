import { useState } from "react";
import Sidebar from "./components/Sidebar";
import Toast from "./components/Toast";
import CreateFromText from "./pages/CreateFromText";
import CreateSingle from "./pages/CreateSingle";
import UpdateItem from "./pages/UpdateItem";
import DeleteItems from "./pages/DeleteItems";
import Settings from "./pages/Settings";
import type { Page } from "./types";

interface ToastState { message: string; type: "success" | "error" | "info" }

export default function App() {
  const [page, setPage]   = useState<Page>("create-text");
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const renderPage = () => {
    switch (page) {
      case "create-text":   return <CreateFromText onToast={showToast} />;
      case "create-single": return <CreateSingle   onToast={showToast} />;
      case "update":        return <UpdateItem      onToast={showToast} />;
      case "delete":        return <DeleteItems     onToast={showToast} />;
      case "settings":      return <Settings        onToast={showToast} />;
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar current={page} onChange={setPage} />
      <main className="flex-1 p-8 overflow-auto">
        {renderPage()}
      </main>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
