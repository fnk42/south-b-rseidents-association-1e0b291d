import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
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
import { ResidentsTab } from "@/components/estate/ResidentsTab";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/estate/$id")({
  head: () => ({
    meta: [
      { title: "Estate · South B Residents Association" },
      {
        name: "description",
        content: "Manage estate details, committee members, and residents.",
      },
    ],
  }),
  component: EstatePage,
});

const COLORS = {
  green: "#1B3A2D",
  gold: "#D4A017",
  bg: "#FAFAF7",
  border: "#e5e2db",
  registered: "#2F8F4E",
  inProgress: "#D49017",
  notRegistered: "#C0392B",
  destructive: "#C0392B",
  grey: "#6b6b6b",
};

type Status = "Registered" | "In Progress" | "Not Registered";
type Role = "Chairperson" | "Vice Chairperson" | "Secretary" | "Treasurer" | "Member";

const STATUSES: Status[] = ["Registered", "In Progress", "Not Registered"];
const ROLES: Role[] = ["Chairperson", "Vice Chairperson", "Secretary", "Treasurer", "Member"];

interface CommitteeMember {
  id: string;
  estate_id: string;
  full_name: string;
  role: Role;
  phone: string | null;
  email: string | null;
}

interface Estate {
  id: string;
  estate_name: string;
  number_of_houses: number | null;
  registration_status: Status;
  committee_members: CommitteeMember[];
}

function statusColor(s: Status) {
  if (s === "Registered") return COLORS.registered;
  if (s === "In Progress") return COLORS.inProgress;
  return COLORS.notRegistered;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function EstatePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { managesEstate } = useAuth();
  const canManage = managesEstate(id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["estate", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estates")
        .select("id, estate_name, number_of_houses, registration_status, committee_members(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Estate;
    },
  });

  const [tab, setTab] = useState<"committee" | "residents">("committee");
  const [editingEstate, setEditingEstate] = useState(false);
  const [residentCount, setResidentCount] = useState(0);

  if (isLoading) {
    return (
      <Shell>
        <div className="p-10 text-sm text-center" style={{ color: "#888" }}>
          Loading estate…
        </div>
      </Shell>
    );
  }
  if (isError || !data) {
    return (
      <Shell>
        <div
          className="p-10 text-center"
          style={{ backgroundColor: "white", border: `1px solid ${COLORS.border}`, borderRadius: 14 }}
        >
          <p className="font-semibold text-lg" style={{ color: COLORS.green }}>
            Estate not found
          </p>
          <p className="mt-2 text-sm" style={{ color: "#777" }}>
            It may have been removed. Head back to the directory.
          </p>
        </div>
      </Shell>
    );
  }

  const committee = data.committee_members ?? [];

  const onEstateSaved = () => {
    setEditingEstate(false);
    toast.success("Estate updated");
    qc.invalidateQueries({ queryKey: ["estate", id] });
    qc.invalidateQueries({ queryKey: ["estates"] });
  };

  return (
    <Shell>
      {/* Header card */}
      <section
        className="mb-6 p-6 relative"
        style={{
          backgroundColor: "white",
          borderRadius: 14,
          border: `1px solid ${COLORS.border}`,
          borderLeft: `5px solid ${COLORS.gold}`,
        }}
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1
                className="text-3xl md:text-4xl font-bold"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: COLORS.green }}
              >
                {data.estate_name}
              </h1>
              <StatusBadge status={data.registration_status} />
            </div>
            <p className="mt-2 text-sm" style={{ color: "#666" }}>
              {data.number_of_houses != null
                ? `${data.number_of_houses} ${data.number_of_houses === 1 ? "house" : "houses"}`
                : "House count not set"}{" "}
              · {committee.length} committee {committee.length === 1 ? "member" : "members"}
            </p>
          </div>
          {canManage && !editingEstate && (
            <button
              onClick={() => setEditingEstate(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-colors"
              style={{ border: `1px solid ${COLORS.border}`, backgroundColor: "white", color: COLORS.green }}
            >
              <Pencil size={14} />
              Edit Estate Info
            </button>
          )}
        </div>

        {editingEstate && (
          <EditEstateForm
            estate={data}
            onCancel={() => setEditingEstate(false)}
            onSaved={onEstateSaved}
          />
        )}
      </section>

      {/* Tabs */}
      <div className="mb-5 flex gap-6" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
        <TabButton active={tab === "committee"} onClick={() => setTab("committee")}>
          Committee ({committee.length})
        </TabButton>
        <TabButton active={tab === "residents"} onClick={() => setTab("residents")}>
          Residents ({residentCount})
        </TabButton>
      </div>

      {tab === "committee" ? (
        <CommitteeTab estateId={id} committee={committee} canManage={canManage} />
      ) : (
        <ResidentsTab
          estateId={id}
          totalHouses={data.number_of_houses}
          onCountChange={setResidentCount}
          canManage={canManage}
        />
      )}
    </Shell>
  );

  // local helpers
  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: COLORS.bg, fontFamily: "'DM Sans', system-ui, sans-serif", color: "#1d1d1b" }}
      >
        <header style={{ backgroundColor: COLORS.green, borderBottom: `3px solid ${COLORS.gold}` }}>
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-4">
            <div
              className="flex items-center justify-center font-bold text-xl"
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: COLORS.gold,
                color: COLORS.green,
                fontFamily: "'Source Serif 4', Georgia, serif",
              }}
            >
              SB
            </div>
            <div className="text-white flex-1">
              <p
                className="font-semibold leading-tight"
                style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
              >
                South B Residents Association
              </p>
              <p className="text-xs text-white/70">Building community, one estate at a time</p>
            </div>
            <UserMenu />
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">
          <button
            onClick={() => navigate({ to: "/" })}
            className="inline-flex items-center gap-1.5 mb-5 text-sm font-medium hover:underline"
            style={{ color: COLORS.green }}
          >
            <ArrowLeft size={16} /> Back to Directory
          </button>
          {children}
        </main>
      </div>
    );
  }
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="pb-3 text-sm font-medium transition-colors"
      style={{
        color: active ? COLORS.green : "#777",
        borderBottom: `2px solid ${active ? COLORS.gold : "transparent"}`,
        marginBottom: -1,
        fontWeight: active ? 600 : 500,
      }}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const bg = statusColor(status);
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-full"
      style={{ backgroundColor: `${bg}1a`, color: bg, border: `1px solid ${bg}33` }}
    >
      {status}
    </span>
  );
}

function EditEstateForm({ estate, onCancel, onSaved }: { estate: Estate; onCancel: () => void; onSaved: () => void }) {
  const [name, setName] = useState(estate.estate_name);
  const [houses, setHouses] = useState(estate.number_of_houses?.toString() ?? "");
  const [status, setStatus] = useState<Status>(estate.registration_status);

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("estates")
        .update({
          estate_name: name.trim(),
          number_of_houses: houses ? Number(houses) : null,
          registration_status: status,
        })
        .eq("id", estate.id);
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
      className="mt-5 p-5"
      style={{ backgroundColor: COLORS.bg, border: `2px solid ${COLORS.gold}`, borderRadius: 12 }}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Estate name *">
          <Input value={name} onChange={(v) => setName(v)} required />
        </Field>
        <Field label="Number of houses">
          <Input type="number" value={houses} onChange={setHouses} placeholder="Optional" />
        </Field>
        <Field label="Registration status">
          <Select value={status} onChange={(v) => setStatus(v as Status)} options={STATUSES} />
        </Field>
      </div>
      {mutation.isError && (
        <p className="mt-3 text-sm" style={{ color: COLORS.destructive }}>
          Could not save: {(mutation.error as Error).message}
        </p>
      )}
      <div className="mt-5 flex gap-2 justify-end">
        <SecondaryButton onClick={onCancel} type="button">
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={mutation.isPending || !name.trim()}>
          {mutation.isPending ? "Saving…" : "Save changes"}
        </PrimaryButton>
      </div>
    </form>
  );
}

function CommitteeTab({ estateId, committee, canManage }: { estateId: string; committee: CommitteeMember[]; canManage: boolean }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CommitteeMember | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["estate", estateId] });
    qc.invalidateQueries({ queryKey: ["estates"] });
  };

  const deleteMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from("committee_members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      setConfirmDelete(null);
      toast.success("Committee member removed");
      invalidate();
    },
    onError: (e: Error) => toast.error(`Could not remove: ${e.message}`),
  });

  if (committee.length === 0 && !adding) {
    return (
      <div
        className="p-12 text-center"
        style={{ backgroundColor: "white", border: `1px solid ${COLORS.border}`, borderRadius: 14 }}
      >
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
          No committee members added yet
        </h3>
        <p className="text-sm mb-5" style={{ color: "#777" }}>
          Add the people leading this estate so residents can reach out.
        </p>
        {canManage ? <PrimaryButton onClick={() => setAdding(true)}>
          <Plus size={16} /> Add First Member
        </PrimaryButton> : <p className="text-xs text-muted-foreground">Sign in as a committee member of this estate to add details.</p>}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <p className="text-sm max-w-xl" style={{ color: "#555" }}>
          Committee members managing this estate. Add as many or as few as needed.
        </p>
        {canManage && !adding && (
          <PrimaryButton onClick={() => setAdding(true)}>
            <Plus size={16} /> Add Member
          </PrimaryButton>
        )}
      </div>

      {adding && (
        <MemberForm
          estateId={estateId}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            toast.success("Committee member added");
            invalidate();
          }}
        />
      )}

      <section
        className="overflow-hidden"
        style={{ backgroundColor: "white", border: `1px solid ${COLORS.border}`, borderRadius: 14 }}
      >
        {committee.length === 0 ? (
          <div className="p-8 text-sm text-center" style={{ color: "#888" }}>
            No committee members yet.
          </div>
        ) : (
          <ul>
            {committee.map((m, i) => (
              <li
                key={m.id}
                style={{ borderTop: i === 0 ? "none" : `1px solid ${COLORS.border}` }}
              >
                {editingId === m.id ? (
                  <div className="p-4">
                    <MemberForm
                      estateId={estateId}
                      member={m}
                      onCancel={() => setEditingId(null)}
                      onSaved={() => {
                        setEditingId(null);
                        toast.success("Committee member updated");
                        invalidate();
                      }}
                    />
                  </div>
                ) : (
                  <MemberRow
                    member={m}
                    onEdit={canManage ? () => setEditingId(m.id) : undefined}
                    onDelete={canManage ? () => setConfirmDelete(m) : undefined}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove committee member?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete
                ? `Remove ${confirmDelete.full_name} from the committee? This cannot be undone.`
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
    </>
  );
}

function MemberRow({
  member,
  onEdit,
  onDelete,
}: {
  member: CommitteeMember;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const isChair = member.role === "Chairperson";
  const isViceChair = member.role === "Vice Chairperson";
  const avatarBg = isChair || isViceChair ? COLORS.green : "#8b8b8b";
  const roleColor = isChair ? COLORS.gold : COLORS.grey;

  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div
        className="flex items-center justify-center font-semibold text-sm flex-shrink-0"
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          backgroundColor: avatarBg,
          color: "white",
        }}
      >
        {initials(member.full_name) || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold" style={{ color: COLORS.green }}>
          {member.full_name}
        </div>
        <div className="text-xs font-medium uppercase tracking-wider mt-0.5" style={{ color: roleColor }}>
          {member.role}
        </div>
        {(member.phone || member.email) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "#777" }}>
            {member.phone && (
              <a href={`tel:${member.phone}`} className="inline-flex items-center gap-1 hover:underline">
                <Phone size={12} /> {member.phone}
              </a>
            )}
            {member.email && (
              <a href={`mailto:${member.email}`} className="inline-flex items-center gap-1 hover:underline">
                <Mail size={12} /> {member.email}
              </a>
            )}
          </div>
        )}
      </div>
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-1">
          {onEdit && (
            <IconButton onClick={onEdit} label="Edit">
              <Pencil size={15} />
            </IconButton>
          )}
          {onDelete && (
            <IconButton onClick={onDelete} label="Delete" destructive>
              <Trash2 size={15} />
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

function MemberForm({
  estateId,
  member,
  onCancel,
  onSaved,
}: {
  estateId: string;
  member?: CommitteeMember;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(member?.full_name ?? "");
  const [role, setRole] = useState<Role>(member?.role ?? "Member");
  const [phone, setPhone] = useState(member?.phone ?? "");
  const [email, setEmail] = useState(member?.email ?? "");

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: fullName.trim(),
        role,
        phone: phone.trim() || null,
        email: email.trim() || null,
      };
      if (member) {
        const { error } = await supabase.from("committee_members").update(payload).eq("id", member.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("committee_members")
          .insert({ ...payload, estate_id: estateId });
        if (error) throw error;
      }
    },
    onSuccess: onSaved,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!fullName.trim()) return;
        mutation.mutate();
      }}
      className="mb-5 p-5"
      style={{ backgroundColor: "white", border: `2px solid ${COLORS.gold}`, borderRadius: 12 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h4
          className="font-semibold"
          style={{ fontFamily: "'Source Serif 4', Georgia, serif", color: COLORS.green }}
        >
          {member ? "Edit member" : "Add committee member"}
        </h4>
        <button type="button" onClick={onCancel} aria-label="Close" style={{ color: "#888" }}>
          <X size={16} />
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full name *">
          <Input value={fullName} onChange={setFullName} required placeholder="e.g. Jane Mwangi" />
        </Field>
        <Field label="Role *">
          <Select value={role} onChange={(v) => setRole(v as Role)} options={ROLES} />
        </Field>
        <Field label="Phone">
          <Input value={phone} onChange={setPhone} placeholder="+254…" />
        </Field>
        <Field label="Email">
          <Input value={email} onChange={setEmail} type="email" placeholder="name@example.com" />
        </Field>
      </div>
      {mutation.isError && (
        <p className="mt-3 text-sm" style={{ color: COLORS.destructive }}>
          Could not save: {(mutation.error as Error).message}
        </p>
      )}
      <div className="mt-5 flex gap-2 justify-end">
        <SecondaryButton onClick={onCancel} type="button">
          Cancel
        </SecondaryButton>
        <PrimaryButton type="submit" disabled={mutation.isPending || !fullName.trim()}>
          {mutation.isPending ? "Saving…" : member ? "Save changes" : "Add member"}
        </PrimaryButton>
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