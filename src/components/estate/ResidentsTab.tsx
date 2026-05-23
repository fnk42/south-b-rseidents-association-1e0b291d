import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Mail,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const COLORS = {
  green: "#1B3A2D",
  gold: "#D4A017",
  bg: "#FAFAF7",
  border: "#e5e2db",
  ownerGreen: "#43A047",
  tenantAmber: "#FFB300",
  housesBlue: "#90CAF9",
  destructive: "#C0392B",
};

type Occupancy = "Owner" | "Tenant";

export interface Resident {
  id: string;
  estate_id: string;
  house_number: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  occupancy: Occupancy;
  owner_name: string | null;
  owner_phone: string | null;
  owner_email: string | null;
}

export function ResidentsTab({
  estateId,
  totalHouses,
  onCountChange,
}: {
  estateId: string;
  totalHouses: number | null;
  onCountChange?: (count: number) => void;
}) {
  const qc = useQueryClient();
  const { data: residents = [], isLoading } = useQuery({
    queryKey: ["residents", estateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("residents")
        .select("*")
        .eq("estate_id", estateId);
      if (error) throw error;
      const list = ((data ?? []) as Resident[]).slice().sort((a, b) =>
        a.house_number.localeCompare(b.house_number, undefined, { numeric: true, sensitivity: "base" })
      );
      onCountChange?.(list.length);
      return list;
    },
  });

  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Resident | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [importBanner, setImportBanner] = useState<{ ok: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["residents", estateId] });
    qc.invalidateQueries({ queryKey: ["estate", estateId] });
  };

  const stats = useMemo(() => {
    const owners = residents.filter((r) => r.occupancy === "Owner").length;
    const tenants = residents.filter((r) => r.occupancy === "Tenant").length;
    const filled = new Set(residents.map((r) => r.house_number.trim())).size;
    return { total: residents.length, owners, tenants, filled };
  }, [residents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return residents;
    return residents.filter((r) => {
      return (
        r.house_number.toLowerCase().includes(q) ||
        r.full_name.toLowerCase().includes(q) ||
        (r.phone ?? "").toLowerCase().includes(q) ||
        (r.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [residents, search]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("residents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmDelete(null);
      toast.success("Resident removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(`Could not remove: ${e.message}`),
  });

  const onFileChosen = async (file: File) => {
    setImportBanner(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
      complete: async (results) => {
        const errors: string[] = [];
        const rows: Omit<Resident, "id" | "estate_id">[] = [];
        results.data.forEach((raw, idx) => {
          const lineNo = idx + 2; // header is line 1
          const houseNumber =
            raw["house_number"] ?? raw["house"] ?? raw["house_no"] ?? "";
          const fullName =
            raw["full_name"] ?? raw["name"] ?? raw["resident"] ?? raw["resident_name"] ?? "";
          const occRaw = (
            raw["occupancy"] ?? raw["type"] ?? raw["status"] ?? ""
          )
            .toString()
            .trim()
            .toLowerCase();
          const phone = raw["phone"] ?? raw["phone_number"] ?? "";
          const email = raw["email"] ?? "";
          const ownerName = raw["owner_name"] ?? raw["landlord"] ?? raw["landlord_name"] ?? "";
          const ownerPhone = raw["owner_phone"] ?? raw["landlord_phone"] ?? "";
          const ownerEmail = raw["owner_email"] ?? raw["landlord_email"] ?? "";

          if (!houseNumber.toString().trim()) {
            errors.push(`Row ${lineNo}: missing house_number`);
            return;
          }
          if (!fullName.toString().trim()) {
            errors.push(`Row ${lineNo}: missing full_name`);
            return;
          }
          let occupancy: Occupancy;
          if (occRaw === "owner") occupancy = "Owner";
          else if (occRaw === "tenant") occupancy = "Tenant";
          else {
            errors.push(`Row ${lineNo}: occupancy must be "Owner" or "Tenant" (got "${occRaw}")`);
            return;
          }
          if (occupancy === "Tenant" && !ownerName.toString().trim()) {
            errors.push(`Row ${lineNo}: tenant rows require owner_name`);
            return;
          }
          rows.push({
            house_number: houseNumber.toString().trim(),
            full_name: fullName.toString().trim(),
            phone: phone.toString().trim() || null,
            email: email.toString().trim() || null,
            occupancy,
            owner_name: ownerName.toString().trim() || null,
            owner_phone: ownerPhone.toString().trim() || null,
            owner_email: ownerEmail.toString().trim() || null,
          });
        });

        let inserted = 0;
        if (rows.length) {
          const payload = rows.map((r) => ({ ...r, estate_id: estateId }));
          const { error } = await supabase.from("residents").insert(payload);
          if (error) {
            errors.push(`Database error: ${error.message}`);
          } else {
            inserted = rows.length;
          }
        }
        setImportBanner({ ok: inserted, errors });
        if (inserted > 0) {
          toast.success(
            `CSV import complete: ${inserted} resident${inserted === 1 ? "" : "s"} added` +
              (errors.length ? ` · ${errors.length} skipped` : "")
          );
        } else if (errors.length) {
          toast.error("CSV import failed — see details");
        }
        invalidate();
      },
      error: (err) => {
        setImportBanner({ ok: 0, errors: [`Could not parse CSV: ${err.message}`] });
      },
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse({
      fields: [
        "house_number",
        "full_name",
        "phone",
        "email",
        "occupancy",
        "owner_name",
        "owner_phone",
        "owner_email",
      ],
      data: [
        ["1", "Jane Mwangi", "+254700000001", "jane@example.com", "Owner", "", "", ""],
        ["2", "John Otieno", "+254700000002", "john@example.com", "Tenant", "Mary Kamau", "+254711111111", "mary@example.com"],
      ],
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "residents-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Residents" value={stats.total} accent={COLORS.green} />
        <StatCard label="Owners" value={stats.owners} accent={COLORS.ownerGreen} />
        <StatCard label="Tenants" value={stats.tenants} accent={COLORS.tenantAmber} />
        <StatCard
          label="Houses Filled"
          value={totalHouses != null ? `${stats.filled}/${totalHouses}` : `${stats.filled}`}
          accent={COLORS.housesBlue}
        />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px] relative">
          <Search
            size={16}
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#999" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, house, phone, or email…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md outline-none focus:border-[#1B3A2D]"
            style={{ border: `1px solid ${COLORS.border}`, backgroundColor: "white" }}
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileChosen(f);
          }}
        />
        <SecondaryButton onClick={() => fileRef.current?.click()}>
          <Upload size={14} /> Upload CSV
        </SecondaryButton>
        <SecondaryButton onClick={downloadTemplate}>
          <Download size={14} /> Download CSV Template
        </SecondaryButton>
        {!adding && (
          <PrimaryButton onClick={() => setAdding(true)}>
            <Plus size={16} /> Add Resident
          </PrimaryButton>
        )}
      </div>

      {importBanner && <ImportBanner banner={importBanner} onClose={() => setImportBanner(null)} />}

      {adding && (
        <ResidentForm
          estateId={estateId}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            invalidate();
          }}
        />
      )}

      {/* Table / empty */}
      <section
        className="overflow-hidden"
        style={{ backgroundColor: "white", border: `1px solid ${COLORS.border}`, borderRadius: 14 }}
      >
        {isLoading ? (
          <div className="p-10 text-sm text-center" style={{ color: "#888" }}>
            Loading residents…
          </div>
        ) : residents.length === 0 ? (
          <div className="p-12 text-center">
            <div
              className="mx-auto mb-4 flex items-center justify-center"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                backgroundColor: `${COLORS.green}10`,
                color: COLORS.green,
              }}
            >
              <Users size={28} />
            </div>
            <h3
              className="text-lg font-semibold mb-1"
              style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: COLORS.green }}
            >
              No residents added yet
            </h3>
            <p className="text-sm" style={{ color: "#777" }}>
              Add residents one by one or upload a CSV.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-sm text-center" style={{ color: "#888" }}>
            No matches for "{search}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: COLORS.bg, color: "#666" }}>
                  <Th>House</Th>
                  <Th>Name</Th>
                  <Th>Contact</Th>
                  <Th>Type</Th>
                  <Th>Owner Info</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) =>
                  editingId === r.id ? (
                    <tr key={r.id}>
                      <td colSpan={6} className="p-4" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                        <ResidentForm
                          estateId={estateId}
                          resident={r}
                          onCancel={() => setEditingId(null)}
                          onSaved={() => {
                            setEditingId(null);
                            invalidate();
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.border}` }}>
                      <Td>
                        <span className="font-bold" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                          {r.house_number}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-medium" style={{ color: COLORS.green }}>
                          {r.full_name}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex flex-col gap-0.5 text-xs" style={{ color: "#666" }}>
                          {r.phone && (
                            <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:underline">
                              <Phone size={11} /> {r.phone}
                            </a>
                          )}
                          {r.email && (
                            <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:underline">
                              <Mail size={11} /> {r.email}
                            </a>
                          )}
                          {!r.phone && !r.email && <span style={{ color: "#bbb" }}>—</span>}
                        </div>
                      </Td>
                      <Td>
                        <OccupancyPill occupancy={r.occupancy} />
                      </Td>
                      <Td>
                        {r.occupancy === "Tenant" && r.owner_name ? (
                          <div className="text-xs" style={{ color: "#555" }}>
                            <div className="font-medium">{r.owner_name}</div>
                            {r.owner_phone && <div>{r.owner_phone}</div>}
                            {r.owner_email && <div className="truncate max-w-[180px]">{r.owner_email}</div>}
                          </div>
                        ) : (
                          <span style={{ color: "#bbb" }}>—</span>
                        )}
                      </Td>
                      <Td className="text-right">
                        <div className="inline-flex gap-1">
                          <IconButton label="Edit" onClick={() => setEditingId(r.id)}>
                            <Pencil size={14} />
                          </IconButton>
                          <IconButton label="Delete" destructive onClick={() => setConfirmDelete(r)}>
                            <Trash2 size={14} />
                          </IconButton>
                        </div>
                      </Td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CSV format guide */}
      <div
        className="mt-5"
        style={{ backgroundColor: "white", border: `1px solid ${COLORS.border}`, borderRadius: 14 }}
      >
        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium"
          style={{ color: COLORS.green }}
        >
          <span>CSV format guide</span>
          {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showGuide && (
          <div className="px-5 pb-5 text-sm" style={{ color: "#555" }}>
            <p className="mb-3">
              The importer accepts headers in either snake_case or "Title Case". Column order does not matter.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-1.5" style={{ color: COLORS.green }}>
                  Required
                </h4>
                <ul className="list-disc ml-5 space-y-0.5">
                  <li>
                    <code>house_number</code> (or "House Number")
                  </li>
                  <li>
                    <code>full_name</code> (or "Name")
                  </li>
                  <li>
                    <code>occupancy</code> (or "Type" / "Status") — must be <code>Owner</code> or <code>Tenant</code>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1.5" style={{ color: COLORS.green }}>
                  Optional
                </h4>
                <ul className="list-disc ml-5 space-y-0.5">
                  <li>
                    <code>phone</code>, <code>email</code>
                  </li>
                  <li>
                    <code>owner_name</code> (required when occupancy is Tenant)
                  </li>
                  <li>
                    <code>owner_phone</code>, <code>owner_email</code>
                  </li>
                </ul>
              </div>
            </div>
            <div
              className="mt-4 p-3 text-xs overflow-x-auto"
              style={{ backgroundColor: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontFamily: "ui-monospace, monospace" }}
            >
              house_number,full_name,phone,email,occupancy,owner_name,owner_phone,owner_email
              <br />
              1,Jane Mwangi,+254700000001,jane@example.com,Owner,,,
              <br />
              2,John Otieno,+254700000002,john@example.com,Tenant,Mary Kamau,+254711111111,mary@example.com
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove resident?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete
                ? `Remove ${confirmDelete.full_name} (House ${confirmDelete.house_number}) from this estate? This cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmDelete) deleteMutation.mutate(confirmDelete.id);
              }}
              style={{ backgroundColor: COLORS.destructive, color: "white" }}
            >
              {deleteMutation.isPending ? "Removing…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div
      className="p-4"
      style={{
        backgroundColor: "white",
        border: `1px solid ${COLORS.border}`,
        borderLeft: `4px solid ${accent}`,
        borderRadius: 10,
      }}
    >
      <div className="text-xs uppercase tracking-wider" style={{ color: "#888" }}>
        {label}
      </div>
      <div
        className="mt-1 text-2xl font-bold"
        style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: COLORS.green }}
      >
        {value}
      </div>
    </div>
  );
}

function OccupancyPill({ occupancy }: { occupancy: Occupancy }) {
  const color = occupancy === "Owner" ? COLORS.ownerGreen : COLORS.tenantAmber;
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}1f`, color, border: `1px solid ${color}40` }}
    >
      {occupancy}
    </span>
  );
}

function ImportBanner({
  banner,
  onClose,
}: {
  banner: { ok: number; errors: string[] };
  onClose: () => void;
}) {
  const hasErrors = banner.errors.length > 0;
  const allFailed = banner.ok === 0 && hasErrors;
  const bg = allFailed ? "#FFF1F0" : hasErrors ? "#FFFCF0" : "#F0F9F2";
  const border = allFailed ? "#F5B7B1" : hasErrors ? "#FFE082" : "#A8D5B6";
  const Icon = allFailed ? AlertTriangle : CheckCircle2;
  const iconColor = allFailed ? COLORS.destructive : hasErrors ? COLORS.tenantAmber : COLORS.ownerGreen;
  return (
    <div
      className="mb-4 p-4 flex gap-3"
      style={{ backgroundColor: bg, border: `1px solid ${border}`, borderRadius: 10 }}
    >
      <Icon size={18} style={{ color: iconColor, flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 text-sm" style={{ color: "#333" }}>
        <div className="font-medium">
          Imported {banner.ok} resident{banner.ok === 1 ? "" : "s"}
          {hasErrors ? ` · ${banner.errors.length} row${banner.errors.length === 1 ? "" : "s"} skipped` : ""}
        </div>
        {hasErrors && (
          <ul className="mt-1 list-disc ml-5 text-xs" style={{ color: "#666" }}>
            {banner.errors.slice(0, 8).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {banner.errors.length > 8 && <li>…and {banner.errors.length - 8} more</li>}
          </ul>
        )}
      </div>
      <button type="button" onClick={onClose} aria-label="Dismiss" style={{ color: "#888" }}>
        <X size={16} />
      </button>
    </div>
  );
}

function ResidentForm({
  estateId,
  resident,
  onCancel,
  onSaved,
}: {
  estateId: string;
  resident?: Resident;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [houseNumber, setHouseNumber] = useState(resident?.house_number ?? "");
  const [fullName, setFullName] = useState(resident?.full_name ?? "");
  const [phone, setPhone] = useState(resident?.phone ?? "");
  const [email, setEmail] = useState(resident?.email ?? "");
  const [occupancy, setOccupancy] = useState<Occupancy>(resident?.occupancy ?? "Owner");
  const [ownerName, setOwnerName] = useState(resident?.owner_name ?? "");
  const [ownerPhone, setOwnerPhone] = useState(resident?.owner_phone ?? "");
  const [ownerEmail, setOwnerEmail] = useState(resident?.owner_email ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        house_number: houseNumber.trim(),
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        occupancy,
        owner_name: occupancy === "Tenant" ? ownerName.trim() || null : null,
        owner_phone: occupancy === "Tenant" ? ownerPhone.trim() || null : null,
        owner_email: occupancy === "Tenant" ? ownerEmail.trim() || null : null,
      };
      if (resident) {
        const { error } = await supabase.from("residents").update(payload).eq("id", resident.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("residents").insert({ ...payload, estate_id: estateId });
        if (error) throw error;
      }
    },
    onSuccess: onSaved,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!houseNumber.trim() || !fullName.trim()) return;
    if (occupancy === "Tenant") {
      if (!ownerName.trim()) {
        setFormError("Owner name is required for tenants.");
        return;
      }
      if (!ownerPhone.trim() && !ownerEmail.trim()) {
        setFormError("Provide at least one owner contact (phone or email).");
        return;
      }
    }
    mutation.mutate();
  };

  return (
    <form
      onSubmit={submit}
      className="mb-5 p-5"
      style={{ backgroundColor: "white", border: `2px solid ${COLORS.gold}`, borderRadius: 12 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h4
          className="font-semibold"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: COLORS.green }}
        >
          {resident ? "Edit resident" : "Add resident"}
        </h4>
        <button type="button" onClick={onCancel} aria-label="Close" style={{ color: "#888" }}>
          <X size={16} />
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="House number *">
          <Input value={houseNumber} onChange={setHouseNumber} required placeholder="e.g. 12B" />
        </Field>
        <Field label="Full name *">
          <Input value={fullName} onChange={setFullName} required />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={setPhone} placeholder="+254…" />
        </Field>
        <Field label="Email">
          <Input value={email} onChange={setEmail} type="email" />
        </Field>
        <Field label="Occupancy *">
          <Select value={occupancy} onChange={(v) => setOccupancy(v as Occupancy)} options={["Owner", "Tenant"]} />
        </Field>
      </div>

      {occupancy === "Tenant" && (
        <div
          className="mt-4 p-4"
          style={{ backgroundColor: "#FFFCF0", border: `1px solid #FFE082`, borderRadius: 10 }}
        >
          <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: "#8a6d00" }}>
            Landlord details
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Owner name *">
              <Input value={ownerName} onChange={setOwnerName} required />
            </Field>
            <Field label="Owner phone">
              <Input value={ownerPhone} onChange={setOwnerPhone} />
            </Field>
            <Field label="Owner email">
              <Input value={ownerEmail} onChange={setOwnerEmail} type="email" />
            </Field>
          </div>
          <p className="mt-2 text-xs" style={{ color: "#8a6d00" }}>
            At least one owner contact (phone or email) is required.
          </p>
        </div>
      )}

      {(formError || mutation.isError) && (
        <p className="mt-3 text-sm" style={{ color: COLORS.destructive }}>
          {formError ?? (mutation.error as Error).message}
        </p>
      )}
      <div className="mt-5 flex gap-2 justify-end">
        <SecondaryButton onClick={onCancel} type="button">
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : resident ? "Save changes" : "Add resident"}
        </PrimaryButton>
      </div>
    </form>
  );
}

/* ---------- shared little UI bits ---------- */

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`text-left text-xs font-medium uppercase tracking-wider px-4 py-3 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className ?? ""}`}>{children}</td>;
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

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 text-sm rounded-md outline-none focus:border-[#1B3A2D]"
      style={{ border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bg }}
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 text-sm rounded-md outline-none focus:border-[#1B3A2D]"
      style={{ border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.bg }}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { children, style, className, ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full disabled:opacity-50 ${className ?? ""}`}
      style={{ backgroundColor: COLORS.green, color: "white", ...style }}
    >
      {children}
    </button>
  );
}

function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { children, style, className, ...rest } = props;
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full ${className ?? ""}`}
      style={{ border: `1px solid ${COLORS.border}`, backgroundColor: "white", color: "#333", ...style }}
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  onClick,
  label,
  destructive,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="p-2 rounded-md hover:bg-black/[0.04] transition-colors"
      style={{ color: destructive ? COLORS.destructive : "#666" }}
    >
      {children}
    </button>
  );
}