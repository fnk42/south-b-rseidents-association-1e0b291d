import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "South B Estate Directory — South B Residents Association" },
      {
        name: "description",
        content:
          "Directory of estates and courts in South B, Nairobi — track registration progress and committee leadership across the neighbourhood.",
      },
      {
        property: "og:title",
        content: "South B Estate Directory",
      },
      {
        property: "og:description",
        content:
          "Building community, one estate at a time. Browse registered estates and chairpersons across South B.",
      },
    ],
  }),
  component: Index,
});

const COLORS = {
  green: "#1B3A2D",
  gold: "#D4A017",
  bg: "#FAFAF7",
  border: "#e5e2db",
  registered: "#2F8F4E",
  inProgress: "#D49017",
  notRegistered: "#C0392B",
};

type Status = "Registered" | "In Progress" | "Not Registered";

interface CommitteeMember {
  full_name: string;
  role: string;
}

interface Estate {
  id: string;
  estate_name: string;
  number_of_houses: number | null;
  registration_status: Status;
  committee_members: CommitteeMember[];
}

const STATUSES: Status[] = ["Registered", "In Progress", "Not Registered"];

function statusColor(s: Status) {
  if (s === "Registered") return COLORS.registered;
  if (s === "In Progress") return COLORS.inProgress;
  return COLORS.notRegistered;
}

async function fetchEstates(): Promise<Estate[]> {
  const { data, error } = await supabase
    .from("estates")
    .select("id, estate_name, number_of_houses, registration_status, committee_members(full_name, role)")
    .order("estate_name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Estate[];
}

function Index() {
  const qc = useQueryClient();
  const { data: estates = [], isLoading } = useQuery({
    queryKey: ["estates"],
    queryFn: fetchEstates,
  });

  const [filter, setFilter] = useState<"All" | Status>("All");
  const [showAdd, setShowAdd] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      All: estates.length,
      Registered: 0,
      "In Progress": 0,
      "Not Registered": 0,
      houses: 0,
    };
    let houses = 0;
    for (const e of estates) {
      c[e.registration_status] = (c[e.registration_status] ?? 0) + 1;
      houses += e.number_of_houses ?? 0;
    }
    c.houses = houses;
    return c;
  }, [estates]);

  const visible = filter === "All" ? estates : estates.filter((e) => e.registration_status === filter);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: COLORS.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: "#1d1d1b" }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: COLORS.green,
          borderBottom: `3px solid ${COLORS.gold}`,
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center gap-4">
          <div
            className="flex items-center justify-center font-bold text-xl"
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: COLORS.gold,
              color: COLORS.green,
              fontFamily: "'Source Serif 4', Georgia, serif",
            }}
          >
            SB
          </div>
          <div className="text-white">
            <h1
              className="text-xl md:text-2xl font-semibold leading-tight"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
            >
              South B Residents Association
            </h1>
            <p className="text-sm text-white/75">Building community, one estate at a time</p>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10">
          {/* Hero */}
          <section className="mb-8">
            <h2
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: COLORS.green }}
            >
              South B Estate Directory
            </h2>
            <p className="max-w-2xl text-base leading-relaxed" style={{ color: "#555" }}>
              A growing register of the estates and courts that make up South B, Nairobi.
              Add your court, track its registration journey, and help your neighbours find the people leading it.
            </p>
          </section>

          {/* Metrics strip */}
          <section
            className="mb-8 grid grid-cols-2 md:grid-cols-5 overflow-hidden"
            style={{ borderRadius: 14, border: `1px solid ${COLORS.border}`, backgroundColor: "white" }}
          >
            <MetricTile
              label="Total estates"
              value={counts.All}
              dark
            />
            <MetricTile label="Total houses" value={counts.houses} />
            <MetricTile label="Registered" value={counts.Registered} dotColor={COLORS.registered} />
            <MetricTile label="In Progress" value={counts["In Progress"]} dotColor={COLORS.inProgress} />
            <MetricTile label="Not Registered" value={counts["Not Registered"]} dotColor={COLORS.notRegistered} />
          </section>

          {/* Filter tabs + add */}
          <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <FilterPill label={`All (${counts.All})`} active={filter === "All"} onClick={() => setFilter("All")} />
              {STATUSES.map((s) => (
                <FilterPill
                  key={s}
                  label={`${s} (${counts[s] ?? 0})`}
                  active={filter === s}
                  onClick={() => setFilter(s)}
                />
              ))}
            </div>
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors"
              style={{
                backgroundColor: COLORS.green,
                color: "white",
              }}
            >
              <Plus size={16} />
              {showAdd ? "Close" : "Add Estate"}
            </button>
          </section>

          {showAdd && (
            <AddEstateForm
              onCancel={() => setShowAdd(false)}
              onSaved={() => {
                setShowAdd(false);
                qc.invalidateQueries({ queryKey: ["estates"] });
              }}
            />
          )}

          {/* Directory list */}
          <section
            className="overflow-hidden"
            style={{ borderRadius: 14, border: `1px solid ${COLORS.border}`, backgroundColor: "white" }}
          >
            {isLoading ? (
              <div className="p-8 text-sm text-center" style={{ color: "#888" }}>
                Loading estates…
              </div>
            ) : visible.length === 0 ? (
              <div className="p-10 text-sm text-center" style={{ color: "#888" }}>
                No estates here yet. Click <span className="font-medium">+ Add Estate</span> to start the directory.
              </div>
            ) : (
              <ul>
                {visible.map((e, i) => {
                  const chair = e.committee_members?.find((m) => m.role === "Chairperson");
                  return (
                    <li
                      key={e.id}
                      style={{ borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}
                    >
                      <Link
                        to="/estate/$id"
                        params={{ id: e.id }}
                        className="flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] transition-colors"
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: statusColor(e.registration_status),
                            flexShrink: 0,
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                            <span className="font-semibold text-base" style={{ color: COLORS.green }}>
                              {e.estate_name}
                            </span>
                            {e.number_of_houses != null && (
                              <span className="text-sm" style={{ color: "#777" }}>
                                {e.number_of_houses} {e.number_of_houses === 1 ? "house" : "houses"}
                              </span>
                            )}
                          </div>
                          <div className="text-sm mt-0.5">
                            {chair ? (
                              <span style={{ color: "#555" }}>
                                Chair: <span className="font-medium">{chair.full_name}</span>
                              </span>
                            ) : (
                              <span className="italic" style={{ color: "#9a978f" }}>
                                No committee details yet
                              </span>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={e.registration_status} />
                        <ChevronRight size={18} style={{ color: "#bbb" }} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>

      <footer
        className="py-6 text-center text-sm"
        style={{ color: "#888", borderTop: `1px solid ${COLORS.border}` }}
      >
        © 2026 South B Residents Association · Nairobi, Kenya
      </footer>
    </div>
  );
}

function MetricTile({
  label,
  value,
  dotColor,
  dark,
}: {
  label: string;
  value: number;
  dotColor?: string;
  dark?: boolean;
}) {
  return (
    <div
      className="p-5"
      style={{
        backgroundColor: dark ? COLORS.green : "white",
        color: dark ? "white" : "#222",
        borderRight: `1px solid ${dark ? "rgba(255,255,255,0.1)" : COLORS.border}`,
      }}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: dark ? "rgba(255,255,255,0.75)" : "#888" }}>
        {dotColor && (
          <span
            aria-hidden
            style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: dotColor }}
          />
        )}
        {label}
      </div>
      <div
        className="mt-1 text-2xl md:text-3xl font-bold"
        style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
      >
        {value}
      </div>
    </div>
  );
}

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-1.5 text-sm rounded-full transition-colors"
      style={{
        backgroundColor: active ? COLORS.green : "white",
        color: active ? "white" : "#333",
        border: `1px solid ${active ? COLORS.green : COLORS.border}`,
        fontWeight: active ? 600 : 500,
      }}
    >
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const bg = statusColor(status);
  return (
    <span
      className="hidden sm:inline-flex text-xs font-medium px-2.5 py-1 rounded-full"
      style={{
        backgroundColor: `${bg}1a`,
        color: bg,
        border: `1px solid ${bg}33`,
      }}
    >
      {status}
    </span>
  );
}

function AddEstateForm({ onCancel, onSaved }: { onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [houses, setHouses] = useState("");
  const [status, setStatus] = useState<Status>("Not Registered");

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        estate_name: name.trim(),
        number_of_houses: houses ? Number(houses) : null,
        registration_status: status,
      };
      const { error } = await supabase.from("estates").insert(payload);
      if (error) throw error;
    },
    onSuccess: onSaved,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        mutation.mutate();
      }}
      className="mb-6 p-5"
      style={{
        backgroundColor: "white",
        border: `2px solid ${COLORS.gold}`,
        borderRadius: 14,
      }}
    >
      <h3
        className="text-lg font-semibold mb-4"
        style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: COLORS.green }}
      >
        Add a new estate
      </h3>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Estate name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Riverside Court"
            className="w-full px-3 py-2 text-sm rounded-md outline-none focus:border-[#1B3A2D]"
            style={{ border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bg }}
          />
        </Field>
        <Field label="Number of houses">
          <input
            type="number"
            min={0}
            value={houses}
            onChange={(e) => setHouses(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 text-sm rounded-md outline-none focus:border-[#1B3A2D]"
            style={{ border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bg }}
          />
        </Field>
        <Field label="Registration status">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            className="w-full px-3 py-2 text-sm rounded-md outline-none focus:border-[#1B3A2D]"
            style={{ border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bg }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {mutation.isError && (
        <p className="mt-3 text-sm" style={{ color: COLORS.notRegistered }}>
          Could not save: {(mutation.error as Error).message}
        </p>
      )}
      <div className="mt-5 flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-full"
          style={{ border: `1px solid ${COLORS.border}`, backgroundColor: "white", color: "#333" }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={mutation.isPending || !name.trim()}
          className="px-5 py-2 text-sm font-medium rounded-full disabled:opacity-50"
          style={{ backgroundColor: COLORS.green, color: "white" }}
        >
          {mutation.isPending ? "Saving…" : "Save estate"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "#666" }}>
        {label}
      </span>
      {children}
    </label>
  );
}