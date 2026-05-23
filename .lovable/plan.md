# South B Residents Association — Estate Directory

The database is already provisioned (estates, committee_members, residents with the schema you specified and open RLS for the MVP). This plan covers the landing page.

## What I'll build

### `src/routes/__root.tsx` (small edit)
Add Google Fonts links for **DM Sans** (UI) and **Source Serif 4** (headings).

### `src/routes/index.tsx` (full rewrite — replaces placeholder)

**Header** (sticky, dark green `#1B3A2D`, 3px gold `#D4A017` bottom border)
- Gold rounded square with "SB" monogram
- Title "South B Residents Association" (Source Serif)
- Subtitle "Building community, one estate at a time"

**Hero**
- "South B Estate Directory" (Source Serif, large)
- Short community paragraph

**Metrics strip** (horizontal bar of stat tiles)
- Total estates (dark-green tile, white text)
- Total houses
- Registered count (green dot)
- In Progress count (amber dot)
- Not Registered count (red dot)

**Filter tabs** (pill buttons with live counts)
`All (N)` · `Registered (N)` · `In Progress (N)` · `Not Registered (N)` — active pill = dark green bg / white text; inactive = white / dark text / subtle border.

**Add Estate**
- `+ Add Estate` button toggles an inline card (white, gold `#D4A017` border)
- Fields: estate name (required), number of houses (optional), status dropdown defaulting to "Not Registered"
- Save → inserts into `estates`, refetches list, collapses form

**Estate directory list**
- Each row: status dot, estate name (bold), house count, chairperson name (or italic "No committee details yet"), status badge, chevron
- Whole row is a link to `/estate/$id` (route doesn't exist yet — clicking shows the default 404 for now; we'll add the detail page next)

**Footer**
- "© 2026 South B Residents Association · Nairobi, Kenya"

### Data fetching
- Use `@tanstack/react-query` + the browser `supabase` client (open RLS allows anon read/write)
- One query: estates with their committee_members (single round trip via `select('*, committee_members(full_name, role)')`)
- Derive counts client-side; filter list client-side

### Design tokens
- Colors are taken straight from your spec (`#1B3A2D`, `#D4A017`, `#FAFAF7`, `#e5e2db`, status greens/ambers/reds) and applied inline / via Tailwind arbitrary values — no need to rework the global theme tokens for this single-page MVP
- Cards: white bg, 1px `#e5e2db` border, 14px radius
- DM Sans for UI text, Source Serif 4 for the page title and hero heading

## Out of scope (for this turn)
- `/estate/:id` detail page (committee + residents management)
- Edit/delete of estates
- Auth (table policies are open per the MVP spec)

Ready to switch to build mode and ship this.
