# Estate detail page — `/estate/:id`

New route: `src/routes/estate.$id.tsx` (no other files change).

## Layout

- **Top bar**: `← Back to Directory` link → `/`.
- **Estate header card** (white, gold accent on left edge):
  - Estate name as large Source Serif heading
  - Status badge inline (same pill style as the directory)
  - Subtitle: `X houses · Y committee members` (auto-pluralized; "—" when house count is null)
  - `Edit Estate Info` button on the right
- **Inline edit form** (collapsible, gold-bordered card): `estate_name`, `number_of_houses`, `registration_status` dropdown. Save / Cancel. On save → update DB, refetch, collapse.
- **Tabs** (Committee / Residents) with a 2px gold `#D4A017` underline under the active tab. Tab labels include live counts. Residents tab shows a "Coming next" placeholder for this turn (the spec only details Committee behaviour).

## Committee tab

- Helper sentence: "Committee members managing this estate. Add as many or as few as needed."
- `+ Add Member` button → toggles inline gold-bordered form: `full_name*`, `role*` (Chairperson / Vice Chairperson / Secretary / Treasurer / Member), `phone`, `email`. Save / Cancel.
- **Member rows**:
  - Avatar circle with initials. Background = dark green `#1B3A2D` for Chairperson/Vice Chairperson, neutral grey for others. White initials.
  - Name (bold) + role label below. Role label coloured gold `#D4A017` for Chairperson, muted grey for everyone else.
  - Phone and email shown as small muted text (with `mailto:` / `tel:` links when present).
  - Per-row `Edit` and `Delete` icon buttons (pencil + trash, lucide-react — no emoji).
- **Edit a member**: clicking Edit swaps that row in-place for the same form layout, Save / Cancel.
- **Delete a member**: opens a confirmation dialog ("Remove {name} from the committee? This cannot be undone.") with Cancel / Delete buttons. Delete is destructive-red.
- **Empty state**: centered card with a lucide `Users` icon in a soft circle (NOT an emoji — matches the user's "no WhatsApp-looking emoticons" note), heading "No committee members added yet", subtext, and a primary `+ Add First Member` button that opens the same add form.

## Landing-page integration
Already wired — the `/` query selects `committee_members(full_name, role)` and shows the Chairperson. As soon as a Chairperson is saved on this detail page, the directory's React Query cache is invalidated on navigation back, so the chair name appears on the row.

## Iconography rule (project-wide)
No emoji in UI. All glyphs come from `lucide-react`: `ArrowLeft`, `Pencil`, `Trash2`, `Plus`, `Users`, `Mail`, `Phone`, `X`. Renders crisp at any size and matches the existing landing page.

## Data
- One query: `supabase.from('estates').select('*, committee_members(*)').eq('id', id).single()` — keyed `['estate', id]`.
- Mutations: update estate, insert/update/delete `committee_members`. Each mutation invalidates `['estate', id]` and `['estates']` so the directory's chair name stays in sync.
- Loading → skeleton block. Missing id → "Estate not found" with back link.

## Out of scope (this turn)
- Residents tab CRUD (tab exists with count + placeholder, full UI next turn).
- Deleting the estate itself.

Ready to build.
