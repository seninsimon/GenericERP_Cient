# UI/UX Guidelines: Zenin ERP

All UI changes and new features must follow this document. If something here
doesn't fit a new need, change this document in the same pull request, so the
rules and the code never drift apart.

**Contents**
1. [Principles](#1-principles)
2. [Stack and decisions](#2-stack-and-decisions)
3. [Design tokens](#3-design-tokens)
4. [Layout and navigation](#4-layout-and-navigation)
5. [Tables](#5-tables)
6. [Displaying values](#6-displaying-values)
7. [Forms and record pages](#7-forms-and-record-pages)
8. [Feedback: loading, empty, errors, notifications](#8-feedback-loading-empty-errors-notifications)
9. [Writing (UI copy)](#9-writing-ui-copy)
10. [Responsive design](#10-responsive-design)
11. [Accessibility](#11-accessibility)
12. [Performance](#12-performance)
13. [Component inventory](#13-component-inventory)
14. [Review checklist](#14-review-checklist)

---

## 1. Principles

1. **Data first.** Records are the product. Chrome (borders, colour, shadows,
   decoration) stays quiet so the data stands out. Prefer whitespace and
   hairline borders over boxes and shadows.
2. **One way to do a thing.** The same task looks and behaves the same
   everywhere. Every list uses `DataTable`, every page uses `Page` +
   `PageHeader`, every value goes through `FieldValue`.
3. **Fast, then pretty.** No layout jumps, no blocking spinners for things that
   can load in the background, and no confirmation for actions that can be
   undone.
4. **Obvious next step.** Each screen has at most **one primary action**
   (filled button), placed top-right in the page header. Everything else is
   secondary.
5. **Forgiving.** Validate inline, say what went wrong and how to fix it, keep
   what the user typed, and ask before destroying anything.
6. **Accessible by default.** Keyboard, screen readers, contrast and reduced
   motion are part of "done", not extras.

Reference products for tone and density: Linear, Stripe Dashboard, Attio,
Vercel. These are calm, neutral and dense, but never cramped.

---

## 2. Stack and decisions

| Decision | Choice | Why |
|---|---|---|
| Component library | **Mantine 8** | Accessible components; forms, dates, modals, notifications, rich text and a command palette built in. A full theme gives us a custom look without owning hundreds of primitive components. (shadcn/ui was considered: it gives full ownership of the markup, but we would have to build or assemble the dates, rich text, form and notification pieces we already have.) |
| Tables | **Our `DataTable`** (TanStack Table + Mantine `Table`) | Full control over the toolbar, density, column views, mobile cards and server mode. Replaces `mantine-react-table`, a beta package with a dated look. |
| Styling | **Mantine theme + style props + CSS modules** | One styling system. **No Tailwind, no inline hex colours, no `!important`.** |
| Icons | **Tabler icons only** (`@tabler/icons-react`) | One consistent stroke style. |
| Font | **Inter Variable**, self-hosted (`@fontsource-variable/inter`) | Built for UI; served from our own origin (the CSP blocks external fonts). |
| Command palette | `@mantine/spotlight` (Ctrl/⌘ K) | Fast navigation for keyboard users. |

---

## 3. Design tokens

All tokens live in `src/theme/theme.ts`. **Never hard-code colours, sizes or
shadows in components.**

### Colour

| Token | Use |
|---|---|
| `primary` (accent, default **indigo**; users can switch to blue, teal or violet) | primary buttons, links, active navigation, focus, selection |
| `--app-bg` | page background behind content |
| `--app-surface` | cards, tables, sidebar, header |
| `--app-border` | every hairline border and divider |
| `--app-muted` | table headers, subtle fills |
| `dimmed` (`c="dimmed"`) | secondary text, captions, placeholders |
| `red` | errors, destructive actions, "danger zone" |
| `teal` / `green` | success, "Yes", completed |
| `yellow` / `orange` | warnings, needs attention, partial results |
| `blue` | information, in-progress |
| `gray` | neutral badges, disabled, "No" |

- **Contrast is built into the tokens.**
  - Light badges and alerts, dimmed text, placeholders, field errors and links
    all meet 4.5:1 (see `cssVariablesResolver` in `theme.ts`).
  - For red text use `c="var(--mantine-color-error)"`, not `c="red"`.
  - For coloured text on tints use `var(--mantine-color-<color>-light-color)`.
  - Accent buttons use the darkest-needed shade (`ACCENT_SHADE`).
- **Never use colour alone** to carry meaning. Pair it with text or an icon
  (✓ Yes, ✕ No, the status word).
- **Light and dark mode are both first-class.** Use tokens and CSS variables,
  which adapt automatically. Check every change in both modes.

### Typography (Inter, base 14 px for application UI)

| Role | Style |
|---|---|
| Page title | `Title order={2}`, 22 px / 600 |
| Section title | `Title order={4}`, 16 px / 600 |
| Body, table cells, inputs | `size="sm"`, 14 px / 400 |
| Captions, helper text, table headers | `size="xs"`, 12 px |
| Numbers in tables and stats | add `className="tabular-nums"` so digits line up |

### Spacing, shape and depth

- **Spacing:** 4 px base scale. Use Mantine spacing tokens: `xs` 10, `sm` 12,
  `md` 16, `lg` 20, `xl` 32.
  - Page padding: `md` on phones, `lg` on tablets, `xl` on desktops (handled by `Page`).
  - Gap between page sections: `lg`. Inside cards: `md`.
- **Radius:** inputs and buttons `md` (8 px), cards, tables and modals `lg`
  (12 px), pills `xl`.
- **Depth:** surfaces use **borders, not shadows**. Shadows are only for things
  floating above the page (menus, popovers, modals, notifications).
- **Motion:** 150 ms, ease-out, only for state changes (open/close, hover).
  Mantine respects `prefers-reduced-motion`.

---

## 4. Layout and navigation

```
┌──────────┬─────────────────────────────────────────────────────────────┐
│ Z Zenin  │ Breadcrumbs › Current page        [⇄ jobs] [☾] [Avatar ▾]   │ header 56 px
│ [Search] ├─────────────────────────────────────────────────────────────┤
│ Home     │  PageHeader: Title  meta                 [secondary][PRIMARY]│
│ Imports  │                                                             │
│ TABLES   │  Content (DataTable / Sections / Form)                      │
│ • Orders │                                                             │
│ ADMIN    │                                                             │
│ • Users  │                                                             │
└──────────┴─────────────────────────────────────────────────────────────┘
 248 px (or a 64 px icon rail)
```

### Sidebar (`src/layout/Sidebar.tsx`)

- **Order:** Home and workspace pages, then the **Tables** the user can access,
  then **Administration** (admins only). No filter box: finding a table by
  name is the search's job (Ctrl K), which is at the top of the sidebar.
- **Active item:** accent background. One active item at a time.
- **Collapsing:** desktops can collapse to a 64 px **icon rail**, with tooltips
  on every icon and the choice remembered. Tablets get the rail by default.
  Phones get a **drawer** opened from the burger, which closes after navigating.
- **New top-level areas** go into `src/layout/nav.ts`, which feeds both the
  sidebar and the command palette.

### Header (`src/layout/Header.tsx`)

- **Left:** breadcrumbs (phones: only the current page title).
- **Right:** search (phones), the imports/exports indicator, the light/dark
  toggle, and the user menu (profile, administration, system status, colour
  scheme, accent colour, sign out).
- Frequently used global actions belong in the header or the command palette,
  **not** duplicated in each page.

### Page anatomy

Every route renders:

```tsx
<Page title="Orders" breadcrumbs={[{ label: "Tables" }, { label: "Orders" }]} width="full">
  <PageHeader title="Orders" description="…" meta={<Badge>…</Badge>} actions={<>…<Button>New order</Button></>} />
  {/* content */}
</Page>
```

- **`width`:**
  - `full` for data tables;
  - `wide` (1200 px) for settings and dashboards;
  - `narrow` (880 px) for forms, record details and the profile.
- **Breadcrumbs:** always set them. The last item is the current page; earlier
  items get `to` links.
- **Actions:** primary action **last**, on the right. On phones they wrap
  below the title. Keep at most 3 visible; put the rest in a "⋯" `Menu`.
- **Sections:** group related content in a `<Section title description actions>`
  card. Destructive settings go in a final `<Section danger title="Danger zone">`.

### Command palette

Ctrl/⌘ K opens `Spotlight`: tables, "New record in …", pages, admin pages, the
theme toggle and sign out. **Every new page or frequent action should be
reachable from it** (add it in `CommandPalette.tsx`).

---

## 5. Tables

**Every list uses `DataTable`** (`src/components/data-table`). Don't build ad-hoc
tables.

```tsx
<DataTable
  label="Orders"                     // accessible name
  mode="server"                      // API does paging/sort/search ("client" for small lists)
  data={rows} getRowId={(r) => r._id}
  columns={columns}                  // DataTableColumn[]
  total={total} totalIsEstimate={estimate}
  page={…} onPageChange={…} pageSize={…} onPageSizeChange={…}
  sort={…} onSortChange={…} search={…} onSearchChange={…}
  toolbar={<FilterBar fields={…} value={filters} onChange={…} />}
  toolbarActions={<Button variant="default">Export</Button>}
  onRowClick={(r) => navigate(recordPath(table, r._id))}
  rowActions={(r) => <><Menu.Item>Edit</Menu.Item><Menu.Item color="red">Delete</Menu.Item></>}
  selectable bulkActions={(ids, clear) => <Button color="red" variant="light">Delete</Button>}
  storageKey={`records:${table}`}    // remembers columns, density, page size
  loading={isLoading} fetching={isFetching} error={…} onRetry={refetch}
  emptyState={(filtered) => filtered ? <EmptyState …/> : <EmptyState … action={…}/>}
/>
```

**Rules**
- **Search** sits top-left and is focusable with `/`. Typing is debounced
  (300 ms).
- **Filters** use `FilterBar` (chips; "Add filter"). Operators depend on the
  column type. Filters, search, sort and page live in the **URL**
  (`useTableUrlState`), so views can be shared and the back button works.
- **Sorting:** the header button with ↑/↓ and `aria-sort`. Only offer it where
  the API can sort.
- **Columns:** users can show/hide and reorder them, and switch density, in the
  "View options" popover, remembered per table. Columns the schema marks as
  hidden start hidden but stay available. The primary (first) column is
  `hideable: false`.
- **Rows:** clicking a row (or pressing Enter on it) opens the record. Secondary
  actions go in the row's **⋯ menu**, not as a row of icons. Destructive items
  are red and last.
- **Bulk actions:** only appear when rows are selected. They replace the
  toolbar with "N selected".
- **Alignment:**
  - numbers right-aligned with `tabular-nums`;
  - text left-aligned;
  - status badges left-aligned.
- **Cells are one line;** overflow truncates with "…". Full values live on the
  record page.
- **Density:** compact (default) or comfortable. Never make rows shorter than
  compact.
- **Footer:** "1–25 of 1,234" (with "~" when the total is an estimate), rows per
  page (10/25/50/100), pagination.
- **States:**
  - first load shows skeleton rows;
  - refreshing shows a 2 px progress bar and keeps the old rows;
  - errors show an alert with **Try again**;
  - an empty table explains why and offers the next step.
- **Phones:** rows render as **cards** showing a title, a subtitle and up to 3
  fields. Set `mobile: "title" | "subtitle" | "hidden"` on columns to control it.

---

## 6. Displaying values

Always render record values with `<FieldValue column={col} value={v} variant="table|detail" />`.
Formatting helpers live in `src/lib/format.ts`.

| Type | Display |
|---|---|
| number | locale-grouped (`1,234.5`), `tabular-nums`, right-aligned in tables |
| date | `12 Mar 2026`; timestamps `12 Mar 2026, 14:05`; recent activity may use relative time ("3 min ago") with the exact time in a tooltip |
| boolean | badge **✓ Yes** (teal) / **✕ No** (gray) |
| relation | linked record names as plain comma-separated text in tables (full list in a tooltip); links to the linked records on detail pages when the user can open them |
| image(s) | rounded thumbnails (28 px in tables, 72 px in details) |
| file(s) | 📄 icon + file name, opens in a new tab |
| rich text | plain-text preview in tables; formatted in detail views |
| empty | a dimmed "—" (never "null", "undefined" or blank) |
| department | neutral badge |

---

## 7. Forms and record pages

### Record pages

- **List:** `/table/:table` (DataTable).
- **Detail:** `/table/:table/:id` is a **read-only details view** (label/value
  pairs), **not** disabled inputs. Its header shows:
  - the record's display name as the title, and the department badge;
  - actions: **Edit** (primary) and a ⋯ menu with History and Delete.
  - On wide screens the activity/history panel sits on the right; on smaller
    screens it opens in a drawer.
- **Create:** `/table/:table/new`. **Edit:** `/table/:table/:id/edit`.

### Form layout

- **Columns:** a single column on phones, two columns from `md`. Long fields
  (textarea, rich text, images, files) span the full width.
- **Labels** sit **above** inputs, in sentence case, with no colon. Mark required
  fields with the asterisk (`withAsterisk`); optional fields aren't marked.
- **Help text:** use `description` for hints, not placeholder text.
  Placeholders show the format ("e.g. INV-0042").
- **Department picker:** shown first, only when the user can choose more than
  one department (admins: always).
- **Sticky action bar** at the bottom: **Cancel** (default) and **Save** (primary)
  on the right. Show "Unsaved changes" when the form is dirty.
- **Keyboard:** Ctrl/⌘ S saves; Esc leaves when the form is unchanged.
- **Do not confirm saves.** Saving happens immediately with a short success
  notification. Leaving with unsaved changes asks first.
- **Errors:** validate on submit (and on blur for format errors). Show them
  **under the field** in red; the API's per-field errors map to the same place.
  Scroll to and focus the first invalid field. Keep everything the user typed.
- **After create,** go to the new record's detail page. **After edit,** go back
  to the detail page.

### Modals and drawers

- Use a **modal** for short, focused tasks (≤ 6 fields): new department, invite
  user, add column.
- Use a **page** for long forms and anything worth linking to.
- Use a **drawer** (right side) for secondary context (history, details
  preview).
- **Modal layout:** the title says the task ("Add column"). Buttons sit
  bottom-right: Cancel, then the primary action named for the task ("Add
  column", not "OK"). On phones, modals are full screen.

### Destructive actions

- Use `confirmDanger({ title, message, confirmLabel })`:
  - the button names the action ("Delete 3 records");
  - the message says what will be lost.
- For unrecoverable, high-impact actions (deleting a table), make the user
  **type the name** to confirm.
- Never confirm reversible actions.

---

## 8. Feedback: loading, empty, errors, notifications

| Situation | Pattern |
|---|---|
| Page/first load | **Skeletons** shaped like the content (not a page-wide spinner) |
| Background refresh | Keep the content; show a thin progress bar or a button `loading` state |
| Button action | `loading` on that button; disable double submits |
| Empty (nothing yet) | `EmptyState`: icon, what this is, primary action ("Create your first table") |
| Empty (filtered) | "No matching records", plus a way to clear the filters |
| No access | `EmptyState` with a lock icon: "You don't have access…" (never a raw 403) |
| Error | Inline `Alert` (red) with the server message and **Try again** |
| Success | Short notification, ≤ 4 s ("Record saved") |
| Long job | Queue it, show the jobs indicator, notify when it finishes |

- **Notifications:** top-right, at most 4 at a time.
- **Titles:** short ("Record deleted").
- **Messages:** the detail or the server's message. Don't stack a notification
  on top of an inline error for the same thing.

---

## 9. Writing (UI copy)

- **Case:**
  - **sentence case** everywhere: "New record", not "New Record";
  - only table and record names keep their own casing.
- **Buttons** are verbs naming the result: "Save changes", "Delete record",
  "Export CSV". Avoid "OK", "Submit" and "Yes".
- **Tone:** plain, friendly, specific.
  - Errors say what happened and what to do: "That username is taken. Try
    another one."
  - Don't blame the user or show codes.
- **Numbers:**
  - use the formatters (`1,234`, "3 records", "~12,000");
  - pluralise correctly with `pluralize()`.
- **Empty values:** "—". Unknown users show as "System".

---

## 10. Responsive design

| Breakpoint | Width | Layout |
|---|---|---|
| base | < 576 px (phones) | sidebar = drawer; tables = cards; forms 1 column; modals full screen; breadcrumbs = title only |
| `xs` / `sm` | 576–992 px (large phones, tablets) | sidebar = icon rail from 768 px; tables scroll horizontally with sticky actions |
| `md` / `lg` | 992–1408 px (laptops) | full sidebar from 1200 px; forms 2 columns; detail + history side panel from `lg` |
| `xl` | > 1408 px | content may widen; `narrow`/`wide` pages stay centred |

- **Mobile first:** use Mantine responsive props (`span={{ base: 12, md: 6 }}`,
  `visibleFrom`, `hiddenFrom`) rather than custom media queries.
- **Touch targets:** at least 36 × 36 px (`ActionIcon size="lg"` in toolbars).
- **No horizontal page scroll.** Wide tables scroll inside their own container.
- **Test** at 375, 768, 1024 and 1440 px before merging.

---

## 11. Accessibility

Target: **WCAG 2.2 AA**.

- **Contrast:** text ≥ 4.5:1, large text and UI components ≥ 3:1. The theme's
  colours meet this; don't use lighter custom greys.
- **Keyboard:**
  - everything works with the keyboard alone;
  - focus is always visible (Mantine focus ring);
  - Tab order follows the visual order.
  - Shortcuts: `Ctrl/⌘ K` opens the palette, `/` focuses the table search,
    `Ctrl/⌘ S` saves forms.
- **Icon-only buttons** (`ActionIcon`) **must** have an `aria-label` and usually
  a `Tooltip`.
- **Forms:** every input has a visible label. Errors are linked to their input
  (Mantine does this when you pass `error`).
- **Tables:**
  - `aria-label` on each table;
  - sortable headers expose `aria-sort`;
  - clickable rows are focusable and open on Enter.
- **Landmarks:** header, `nav` (sidebar, breadcrumbs), and `main#main`. A "Skip
  to content" link appears on focus.
- **Status changes** that aren't obvious, like table totals, use
  `aria-live="polite"`.
- **Motion:** respect `prefers-reduced-motion`; nothing should flash.
- **Images:** meaningful images get an `alt`; decorative icons are
  `aria-hidden`.

---

## 12. Performance

- **Routes are lazy-loaded.** Heavy components (rich-text editor, date pickers)
  load only where they're used.
- **React Query** caches data:
  - lists keep the previous page while the next loads;
  - invalidate precisely after mutations (`["tableData", table]`, `["schema", table]`).
- **Debounce** search inputs (300 ms) and relation searches (250 ms).
- **Never load a whole table:** paginate, and search on the server (relation
  pickers request 50 items).
- **Avoid layout shift:** reserve space with skeletons; give images fixed sizes.
- **Bundle budget:** keep the initial JS under about 250 kB gzipped. Check
  `pnpm build` output when adding dependencies, and add none without
  discussing it.

---

## 13. Component inventory

| Need | Use |
|---|---|
| Page frame, title, breadcrumbs | `Page`, `PageHeader` (`components/ui/Page.tsx`) |
| Card with a title | `Section` |
| Any list | `DataTable` (+ `FilterBar`, `useTableUrlState`) |
| Record values | `FieldValue` |
| Nothing to show | `EmptyState` |
| Delete/disable confirmation | `confirmDanger` |
| Dates, numbers, file names | `lib/format.ts` |
| Navigation entries | `layout/nav.ts` |
| Saved UI preferences | `lib/preferences.tsx`, `lib/storage.ts` (always via the safe helpers) |
| Status | `Badge` (light) with a colour from §3 |
| Primary/secondary/destructive buttons | `Button` filled / `variant="default"` / `color="red"` (`variant="light"` outside dialogs) |
| Icon button | `ActionIcon` + `aria-label` + `Tooltip` |

**Button variants**
- **Filled (primary):** one per view.
- **Default (secondary):** bordered.
- **Subtle:** tertiary actions or inside toolbars.
- **Red:** destructive. Use light inside lists, filled inside a confirm dialog.

---

## 14. Review checklist

Before merging any UI change:

- [ ] Uses `Page`/`PageHeader`, sets breadcrumbs, and has at most one primary action.
- [ ] Lists use `DataTable`; values use `FieldValue`; no hard-coded colours, Tailwind or inline hex.
- [ ] Loading (skeleton), empty, error and no-access states are all designed.
- [ ] Works at 375 / 768 / 1024 / 1440 px with no horizontal page scroll.
- [ ] Looks right in light **and** dark mode.
- [ ] Usable with the keyboard alone; icon buttons have `aria-label`s; focus is visible.
- [ ] Copy is in sentence case; buttons are verbs; errors say how to fix them.
- [ ] Destructive actions use `confirmDanger`; saves are not confirmed.
- [ ] New pages and frequent actions are reachable from the command palette.
- [ ] `pnpm lint && pnpm build` pass; no new dependency without discussion.
