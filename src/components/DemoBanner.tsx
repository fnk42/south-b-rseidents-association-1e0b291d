import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export function DemoBanner({ compact = false }: { compact?: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      role="alert"
      style={{
        backgroundColor: "#FFF4D6",
        borderBottom: "2px solid #D4A017",
        color: "#5b4400",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-start gap-3 text-sm">
        <AlertTriangle size={18} style={{ color: "#D4A017", flexShrink: 0, marginTop: 1 }} />
        <div className="flex-1 leading-snug">
          <span
            className="inline-block mr-2 px-1.5 py-0.5 text-[10px] font-bold tracking-wider rounded"
            style={{ backgroundColor: "#D4A017", color: "#1B3A2D" }}
          >
            DEMO / MVP
          </span>
          {compact ? (
            <span>
              Public demonstration — all data is visible to anyone. The next release will require
              secure login per Kenya's Data Protection Act, 2019.
            </span>
          ) : (
            <span>
              This is a public demonstration. <strong>Do not enter real personal data.</strong>{" "}
              The next release will require secure login and role-based access to protect
              resident and committee data, in compliance with{" "}
              <strong>Kenya's Data Protection Act, 2019</strong>.
            </span>
          )}
        </div>
        {!compact && (
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss notice"
            className="p-1 rounded hover:bg-black/[0.06] transition-colors"
            style={{ color: "#5b4400", flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}