# Premium Dashboard Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a restrained, accessible motion system and premium loading/interaction feedback to the existing CGD Sales Overview and shared shell without changing application behavior.

**Architecture:** Keep motion CSS-native and reuse Recharts animation. Put the only JavaScript motion primitives in one focused client component module, then consume them from Overview while shared shell components use semantic CSS classes.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, CSS animations, Recharts 3, Lucide React.

## Global Constraints

- Do not change database, authentication, APIs, routing, roles, or sales calculations.
- Add no dependency and no external animation asset.
- Keep the existing CGD palette, Inter typography, layouts, light theme, and iconless KPI language.
- Use only opacity/transform for entrance motion and respect `prefers-reduced-motion` globally.
- Preserve user files and unrelated untracked workspace configuration.

---

### Task 1: Motion Contract

**Files:**
- Modify: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Consumes: repository source files through the existing `read(path)` helper.
- Produces: one source contract named `Premium Dashboard motion is native, accessible, and dependency-free`.

- [ ] **Step 1: Write the failing contract**

Add a test that reads `package.json`, `app/globals.css`, `app/page.tsx`, `components/DashboardMotion.tsx`, `components/DashboardShell.tsx`, `components/NotificationBell.tsx`, `components/Modal.tsx`, and `contexts/ToastContext.tsx`, then asserts:

```js
assert.doesNotMatch(pkg, /framer-motion|lottie/)
assert.match(css, /--motion-fast:/)
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
assert.match(motion, /requestAnimationFrame/)
assert.match(motion, /export function AnimatedNumber/)
assert.match(motion, /export function DashboardSkeleton/)
assert.match(page, /<DashboardSkeleton/)
assert.match(page, /isAnimationActive={!reducedMotion}/)
assert.match(shell, /motion-page/)
assert.match(notification, /bell-attention/)
assert.match(modal, /motion-backdrop/)
assert.match(toast, /cgd-toast--exit/)
```

- [ ] **Step 2: Verify RED**

Run `npm.cmd run test:contracts`. Expected: fail because `components/DashboardMotion.tsx` and the motion tokens do not exist.

- [ ] **Step 3: Commit RED evidence**

```powershell
git add scripts/revision-contract.test.mjs
git commit -m "test: define premium dashboard motion contract"
```

---

### Task 2: Native Motion Primitives and Tokens

**Files:**
- Create: `components/DashboardMotion.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: `useReducedMotion(): boolean`.
- Produces: `AnimatedNumber({ value, format, className, duration? })` where `value` is a number and `format` maps a number to visible text.
- Produces: `DashboardSkeleton()` with fixed KPI, performer, chart, and table placeholder blocks.

- [ ] **Step 1: Implement the primitives**

Use `matchMedia('(prefers-reduced-motion: reduce)')` for the hook and `requestAnimationFrame` with cubic ease-out for number interpolation. Counter state starts at zero on first mount, updates only when `value` changes, cancels its frame on cleanup, and immediately resolves to the final value when reduced motion is active.

The rendered number must use:

```tsx
<span className={`motion-number ${className ?? ""}`} aria-label={format(value)}>
  {format(displayValue)}
</span>
```

The skeleton uses the existing responsive grids and only `.skeleton` blocks with fixed heights.

- [ ] **Step 2: Add motion tokens and semantic classes**

Add these root variables:

```css
--motion-fast: 140ms;
--motion-hover: 180ms;
--motion-panel: 240ms;
--motion-data: 700ms;
--ease-enter: cubic-bezier(.16, 1, .3, 1);
--ease-standard: cubic-bezier(.4, 0, .2, 1);
```

Update the existing card, section, row, skeleton, progress, dropdown, nav, button, and toast animations to consume those variables. Add `.motion-page`, `.motion-backdrop`, `.motion-panel`, `.bell-attention`, `.motion-number`, stable focus-visible styling, and a global reduced-motion block that disables non-essential animation, transitions, and smooth scrolling.

- [ ] **Step 3: Run contract**

Run `npm.cmd run test:contracts`. Expected: still fail only on integrations scheduled for Tasks 3 and 4.

---

### Task 3: Overview Data Motion and Loading

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `AnimatedNumber`, `DashboardSkeleton`, and `useReducedMotion` from `components/DashboardMotion.tsx`.

- [ ] **Step 1: Preserve card APIs while accepting animated content**

Change `StatCard.value` and `GaugeCard.value` from `string` to `React.ReactNode`. Keep labels, subtext, dimensions, and card layout unchanged.

- [ ] **Step 2: Replace misleading initial values with skeletons**

After the greeting/filter area render:

```tsx
{loading ? <DashboardSkeleton /> : (
  <div className="dashboard-data-sequence">...</div>
)}
```

Move the current KPI and supporting data sections into the non-loading branch without changing their conditions or calculations.

- [ ] **Step 3: Animate only primary KPI numbers**

Use the existing `formatRupiah` for revenue and pipeline currency, integer formatting for counts, and a signed percentage formatter for month growth. Sales Active animates only the selling count while keeping the active-user denominator static.

- [ ] **Step 4: Reuse Recharts animation**

Configure the existing line with:

```tsx
isAnimationActive={!reducedMotion}
animationDuration={700}
animationEasing="ease-out"
```

Keep the dataset, axes, tooltip, stroke, and active point unchanged.

- [ ] **Step 5: Replace performer emoji with Lucide**

Use the already-installed `Trophy` and `Star` outline icons beside the two labels. Do not add icons to KPI cards.

---

### Task 4: Shared Shell Feedback

**Files:**
- Modify: `components/DashboardShell.tsx`
- Modify: `components/NotificationBell.tsx`
- Modify: `components/Modal.tsx`
- Modify: `components/ConfirmModal.tsx`
- Modify: `contexts/ToastContext.tsx`
- Modify: `components/Header.tsx`
- Modify: `components/Sidebar.tsx`

**Interfaces:**
- Consumes: semantic motion classes from `app/globals.css`.
- Preserves all existing props, route behavior, and callbacks.

- [ ] **Step 1: Add page entrance**

Apply `motion-page` to the existing `main.app-content`. Use `key={pathname}` only on an inner wrapper around `children` so the header and mobile navigation stay stable.

- [ ] **Step 2: Add notification feedback**

Track the previous `staleLeads.length` in a ref. When the count increases, set a local attention flag for 520 ms and apply `bell-attention` to the existing button. Do not animate indefinitely or persist notification state.

- [ ] **Step 3: Add shared overlay motion**

Apply `motion-backdrop` to modal backdrops and `motion-panel` to modal panels. Preserve all close, dirty-state, confirm, and click-propagation behavior.

- [ ] **Step 4: Add toast exit state**

Extend `ToastItem` with `exiting?: boolean`. `dismissToast` marks a toast as exiting, then removes it after 160 ms. Apply `cgd-toast--exit` while exiting. Existing message, type, duration, portal, and click-to-dismiss behavior remain unchanged.

- [ ] **Step 5: Use the shared interaction timings**

Keep Header and Sidebar markup/navigation unchanged. Apply only CSS class/timing improvements, stable translate/colour feedback, active press state, and focus-visible outlines.

- [ ] **Step 6: Verify GREEN and commit**

Run `npm.cmd run test:contracts`. Expected: all contracts pass.

```powershell
git add app/page.tsx app/globals.css components/DashboardMotion.tsx components/DashboardShell.tsx components/NotificationBell.tsx components/Modal.tsx components/ConfirmModal.tsx components/Header.tsx components/Sidebar.tsx contexts/ToastContext.tsx
git commit -m "feat: add premium dashboard motion system"
```

---

### Task 5: Final Verification and Deployment

**Files:**
- Modify only files required by verified findings.

- [ ] **Step 1: Static verification**

Run:

```powershell
npm.cmd run test:contracts
npm.cmd run lint
npm.cmd run build
git diff --check
```

Expected: zero failures and a production build without route changes.

- [ ] **Step 2: Visual QA**

Run the production UI and inspect Overview at 375, 768, 1024, and 1440 px in dark and light modes. Check loading placeholders, counters, chart empty data, filter changes, navigation, notification dropdown, modal close/dirty confirmation, toast dismissal, keyboard focus, reduced motion, and horizontal overflow.

- [ ] **Step 3: Review changed code**

Review only the current task diff for Critical/Important correctness, accessibility, and performance findings. Apply verified fixes and rerun Step 1.

- [ ] **Step 4: Deploy**

Push `master`, then query the Netlify site API and verify the published deploy is `ready`, on `master`, and references the pushed commit.
