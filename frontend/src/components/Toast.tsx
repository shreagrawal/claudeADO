interface Props {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: Props) {
  const styles = {
    success: "bg-green-50 border-green-400 text-green-800",
    error:   "bg-red-50 border-red-400 text-red-800",
    info:    "bg-blue-50 border-blue-400 text-blue-800",
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 px-4 py-3 border rounded-lg shadow-lg max-w-sm ${styles[type]}`}>
      <span className="flex-1 text-sm">{message}</span>
      <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100">×</button>
    </div>
  );
}
