# Overview KPI Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Overview KPI cards consistent and remove only the Omset per Proyek donut chart.

**Architecture:** Keep the change inside the existing Overview page and its source contract. Reuse Tailwind responsive utilities and existing card components without adding dependencies.

**Tech Stack:** Next.js 16, React, Tailwind CSS, Node test runner

## Global Constraints

- Preserve all Overview data and project value cards.
- Remove only the project donut chart.
- Remove decorative icons from all five KPI cards and retain percentage rings.
- Use `Sales Aktif` and one shared typography scale without truncation.
- Do not change mobile navigation or other pages.

---

### Task 1: Overview KPI layout and project section

**Files:**
- Modify: `app/page.tsx`
- Test: `scripts/revision-contract.test.mjs`

**Interfaces:**
- Consumes: existing `StatCard`, `GaugeCard`, `projectData`
- Produces: responsive five-card KPI grid and project cards without a donut

- [ ] **Step 1: Update the source contract**

Assert that Overview retains `Omset per Proyek` and `projectData.map`, has `lg:grid-cols-5`, and no longer imports or renders `PieChart`.

- [ ] **Step 2: Run the contract and verify it fails**

Run: `npm.cmd run test:contracts`

- [ ] **Step 3: Implement the minimal UI change**

Give both KPI card components the same full-height minimum size and typography classes, remove their decorative icon properties, use `Sales Aktif`, change the KPI grid to one/two/five columns, and delete only the donut block and unused Recharts symbols.

- [ ] **Step 4: Verify**

Run: `npm.cmd run test:contracts`, `npm.cmd run lint`, and `npm.cmd run build`.

- [ ] **Step 5: Commit and deploy**

Commit the focused files and push `master` for Netlify deployment.
