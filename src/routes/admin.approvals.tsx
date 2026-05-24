import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, ShieldCheck, Trash2 } from "lucide-react";

export const Route = createFileRoute("/admin/approvals")({
  component: AdminApprovalsPage,
});

const COLORS = { green: "#1B3A2D", gold: "#D4A017", bg: "#FAFAF7", border: "#e5e2db" };

interface Estate { id: string; estate_name: string; }
interface Profile { id: string; email: string | null; full_name: string | null; }
interface RoleRow {
  id: string;
  user_id: string;
  role: "admin" | "committee_member";
  estate_id: string | null;
  approved: boolean;
  created_at: string;
}

function AdminApprovalsPage() {
  const { user, isAdmin, loading, rolesLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !rolesLoading && !isAdmin) navigate({ to: "/" });
  }, [isAdmin, loading, rolesLoading, navigate]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data as Profile[];
    },
    enabled: isAdmin,
  });

  const { data: estates = [] } = useQuery({
    queryKey: ["estates_minimal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("estates").select("id, estate_name").order("estate_name");
      if (error) throw error;
      return data as Estate[];
    },
    enabled: isAdmin,
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["all_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as RoleRow[];
    },
    enabled: isAdmin,
  });

  const profileMap = useMemo(() => Object.fromEntries(profiles.map((p) => [p.id, p])), [profiles]);
  const estateMap = useMemo(() => Object.fromEntries(estates.map((e) => [e.id, e.estate_name])), [estates]);

  // Profiles without any role row → need to be assigned
  const usersWithRoles = new Set(allRoles.map((r) => r.user_id));
  const unassigned = profiles.filter((p) => !usersWithRoles.has(p.id));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["all_roles"] });
    qc.invalidateQueries({ queryKey: ["user_roles"] });
  };

  const assignRole = useMutation({
    mutationFn: async ({ userId, estateId }: { userId: string; estateId: string }) => {
      const { error } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: "committee_member",
        estate_id: estateId,
        approved: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("User approved"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleApprove = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.from("user_roles").update({ approved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loading || rolesLoading) return null;
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <header style={{ backgroundColor: COLORS.green, borderBottom: `3px solid ${COLORS.gold}` }}>
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center gap-3 text-white">
          <ShieldCheck />
          <h1 className="text-xl font-semibold" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
            Admin · Approvals
          </h1>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm" style={{ color: COLORS.green }}>
          <ArrowLeft size={16} /> Back to directory
        </Link>

        <section className="p-6 bg-white" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 14 }}>
          <h2 className="font-semibold mb-1" style={{ color: COLORS.green }}>
            New signups awaiting assignment ({unassigned.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Pick the estate each new user manages. They will get committee access immediately.
          </p>
          {unassigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new signups.</p>
          ) : (
            <ul className="divide-y" style={{ borderColor: COLORS.border }}>
              {unassigned.map((p) => (
                <UnassignedRow
                  key={p.id}
                  profile={p}
                  estates={estates}
                  onAssign={(estateId) => assignRole.mutate({ userId: p.id, estateId })}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="p-6 bg-white" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 14 }}>
          <h2 className="font-semibold mb-4" style={{ color: COLORS.green }}>
            All role assignments ({allRoles.length})
          </h2>
          {allRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">None yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-muted-foreground border-b" style={{ borderColor: COLORS.border }}>
                  <th className="py-2">User</th>
                  <th className="py-2">Role</th>
                  <th className="py-2">Estate</th>
                  <th className="py-2">Status</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {allRoles.map((r) => {
                  const p = profileMap[r.user_id];
                  return (
                    <tr key={r.id} className="border-b" style={{ borderColor: COLORS.border }}>
                      <td className="py-2">{p?.full_name ?? p?.email ?? r.user_id.slice(0, 8)}</td>
                      <td className="py-2 capitalize">{r.role.replace("_", " ")}</td>
                      <td className="py-2">{r.estate_id ? (estateMap[r.estate_id] ?? "—") : "—"}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${r.approved ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                          {r.approved ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => toggleApprove.mutate({ id: r.id, approved: !r.approved })}
                          className="text-xs px-2 py-1 mr-2 rounded border hover:bg-black/[0.03]"
                          style={{ borderColor: COLORS.border }}
                        >
                          {r.approved ? "Revoke" : "Approve"}
                        </button>
                        <button
                          onClick={() => removeRole.mutate(r.id)}
                          className="text-xs p-1 rounded hover:bg-red-50 text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

function UnassignedRow({
  profile,
  estates,
  onAssign,
}: {
  profile: Profile;
  estates: Estate[];
  onAssign: (estateId: string) => void;
}) {
  const [estateId, setEstateId] = useState("");
  return (
    <li className="py-3 flex items-center gap-3 flex-wrap">
      <div className="flex-1 min-w-[200px]">
        <div className="font-medium">{profile.full_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{profile.email}</div>
      </div>
      <select
        value={estateId}
        onChange={(e) => setEstateId(e.target.value)}
        className="px-2 py-1.5 text-sm rounded border bg-white"
        style={{ borderColor: "#e5e2db" }}
      >
        <option value="">Pick estate…</option>
        {estates.map((e) => (
          <option key={e.id} value={e.id}>{e.estate_name}</option>
        ))}
      </select>
      <button
        disabled={!estateId}
        onClick={() => onAssign(estateId)}
        className="px-3 py-1.5 text-sm font-medium rounded text-white disabled:opacity-50"
        style={{ backgroundColor: "#1B3A2D" }}
      >
        Approve as committee
      </button>
    </li>
  );
}