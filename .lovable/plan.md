## What's actually happening

**1. "Anyone signed in sees resident details" — not a bug, but admin scope.**
Your residents RLS policy is correct: `user_manages_estate(auth.uid(), estate_id)` only returns true for an admin OR an approved committee_member of that specific estate. A second signed-in committee member of Estate A genuinely cannot read Estate B's residents at the database level.

The reason you're seeing every estate's residents is that the **first user to sign up is auto-promoted to `admin`** (in the `handle_new_user()` trigger), and admins are intentionally allowed to see every estate. You confirmed you want to keep this behavior. No database changes needed.

**2. The "error on first click, fixed by Try again" — real bug.**
React console error: *"Rendered more hooks than during the previous render"* in `EstatePage`. In `src/routes/estate.$id.tsx`, `useState(0)` for `residentCount` is declared on line 144, **after** the early `return`s for the loading and error states (lines 116–141). 

- First render: the query is loading → early `return` runs → the `useState` call is never reached → React records N hooks.
- Second render: data has arrived → component falls through past the early returns → the extra `useState` runs → React sees N+1 hooks and crashes.
- "Try again" remounts the component; by then the query is cached, so the first render skips the early-return branch — hook count stays consistent and it appears to "self-resolve."

## Fix

### 1. `src/routes/estate.$id.tsx` — restore hook order
Move every hook call (`useState`, `useQuery`, `useNavigate`, `useAuth`, etc.) to the **top** of `EstatePage`, before any conditional `return`. Specifically, hoist `const [residentCount, setResidentCount] = useState(0);` (currently line 144) above the `isLoading` / `isError` early returns. No other logic changes.

### 2. Small UI clarification (optional, recommended)
Because admins legitimately see every estate's residents, add a one-line note on the Residents tab when the viewer is admin-only (not a committee member of *this* estate), so it's clear *why* they can see this data. Example, rendered above the residents table when `isAdmin && !approvedEstateIds.includes(estateId)`:

> "You're viewing this as an administrator. Estate committee members only see their own estate."

This requires exposing `isAdmin` / `approvedEstateIds` from `useAuth` into `ResidentsTab` (already available from the hook — just consume it there). Skip this if you'd rather keep the UI unchanged.

## Out of scope
- No database / RLS changes.
- No auth-flow changes.
- No changes to the existing `canManage` gating on Add/Edit/Delete buttons.

## Verification
After the edit, reload the app, click an estate from the directory on the first try — the page should render the estate header, tabs, and content without the red error screen, and without needing "Try again."
