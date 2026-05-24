import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const { user, loading, isAdmin, signOut } = useAuth();

  if (loading) return null;

  if (!user) {
    return (
      <Link
        to="/auth"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-white/10 text-white hover:bg-white/20 transition"
      >
        <LogIn size={14} /> Sign in
      </Link>
    );
  }

  const label = user.email?.split("@")[0] ?? "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full bg-white/10 text-white hover:bg-white/20 transition">
          <UserIcon size={14} />
          <span className="max-w-[120px] truncate">{label}</span>
          {isAdmin && <ShieldCheck size={14} className="text-yellow-300" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin/approvals" className="cursor-pointer">
              <ShieldCheck className="mr-2 h-4 w-4" /> Admin approvals
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}