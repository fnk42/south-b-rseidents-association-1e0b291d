import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UserRole {
  id: string;
  role: "admin" | "committee_member";
  estate_id: string | null;
  approved: boolean;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: UserRole[];
  isAdmin: boolean;
  approvedEstateIds: string[];
  managesEstate: (estateId: string) => boolean;
  signOut: () => Promise<void>;
  rolesLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const user = session?.user ?? null;

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["user_roles", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_roles")
        .select("id, role, estate_id, approved")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []) as UserRole[];
    },
    enabled: !!user,
  });

  const isAdmin = roles.some((r) => r.role === "admin" && r.approved);
  const approvedEstateIds = roles
    .filter((r) => r.approved && r.role === "committee_member" && r.estate_id)
    .map((r) => r.estate_id as string);

  const managesEstate = (estateId: string) =>
    isAdmin || approvedEstateIds.includes(estateId);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, roles, isAdmin, approvedEstateIds, managesEstate, signOut, rolesLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}