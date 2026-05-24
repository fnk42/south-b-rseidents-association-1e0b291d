## Phase 1 scope

Open directory for populating estates and their committees. **No auth, no residents.** Auth + residents + role approvals come back in Phase 2.

## Changes

### 1. Database RLS (open up for phase 1)
Migration to make estates + committee_members fully public CRUD, and lock down residents:

- **`estates`**: drop existing insert/update/delete policies; add `FOR ALL USING (true) WITH CHECK (true)` so anyone can add, edit, delete.
- **`committee_members`**: drop manager-scoped insert/update/delete policies; add `FOR ALL USING (true) WITH CHECK (true)` so anyone can add, edit, delete committee members on any estate.
- **`residents`**: drop all existing policies and add a single deny-all (no policy / `USING (false)`) — table stays in the schema for Phase 2 but is unreadable/unwritable from the app for now.
- `profiles` and `user_roles` left as-is (harmless — just unused).

### 2. Frontend
- **`src/routes/index.tsx`** — remove the `isAdmin` gate on Add Estate button, the delete button, and the form. Everyone sees them. Drop the resident count column from each estate row.
- **`src/routes/estate.$id.tsx`** — remove the Residents tab entirely; the page becomes a single view: estate details + committee. Remove resident-count fetching.
- **`src/components/estate/ResidentsTab.tsx`** — delete the file.
- **`src/components/UserMenu.tsx`** — remove or replace with nothing; header no longer shows sign-in. (Keep the file but render `null`, or delete and remove the import from `index.tsx` + `estate.$id.tsx`.) Pick: **delete the file and its imports** for a clean phase 1.
- **`src/routes/auth.tsx`** and **`src/routes/admin.approvals.tsx`** — delete. Remove from `routeTree.gen.ts` will happen automatically on next build.
- **`src/hooks/useAuth.tsx`** — delete; remove all `useAuth()` calls (only used for the admin gates we're removing).
- **`src/routes/__root.tsx`** — remove the `AuthProvider` wrapper if present.
- Committee management UI on `estate.$id.tsx` already exists for managers — relax it so anyone can add/edit/delete committee members (drop any `canManage` gating there).

### 3. Notes for the user
- Anyone with the link can add/edit/delete estates and committee members during Phase 1. That's the intent.
- Residents data and the role-approval flow are paused, not deleted — Phase 2 reintroduces auth, the residents tab, and locks editing back down to committee members.

## Out of scope (Phase 2)
- Re-enabling sign in / Google auth.
- Residents tab + RLS scoped to committee members.
- Admin approvals page.
- Per-estate edit lock-down.