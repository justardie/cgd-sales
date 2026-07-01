# Dashboard, Pipeline, and Closing Adjustments

## Scope

Update Overview, Pipeline, and Closing without database or production-data changes.

## Overview

- The revenue KPI follows the selected period. In YTD mode its target is `TEAM_MONTHLY_TARGET * current month number` and its label becomes `Omset YTD`.
- The `vs <previous month>` KPI always compares the current calendar month with its immediately preceding month, regardless of the selected period.
- Active sales count includes active users whose role is `sales_person` or `telemarketing`.
- Remove WIN-OR-DIE from Overview.
- Move the existing annual monthly-revenue chart from Closing to Overview.
- Always show Omset per Proyek. Include every canonical project card, including Rp0 values, and add a donut/pie chart. Zero-value projects remain in the list but do not create artificial chart slices. Show an empty-state center/message if all values are zero.

## Closing

- Remove the annual monthly-revenue chart.
- Add WIN-OR-DIE using each hunter's current-calendar-month revenue and monthly WIN-OR-DIE target. Page filters, including YTD, must not affect it.

## Pipeline

- Remove the PDF button and its export implementation.
- Keep Warm and Hot records in the main table.
- Put `tidak_potensial` records in a separate collapsed section below it, closed by default and showing its record count.
- The collapsed section respects the current search/filter/sort rules. When opened, records retain existing edit and delete actions.

## Implementation Boundaries

- Extract only small pure calculation/presentation helpers where they prevent Overview and Closing logic from diverging.
- Reuse the existing Recharts dependency and visual language.
- Do not modify Supabase schema/data, `.claude/`, authentication, or unrelated pages.

## Verification

- Contract/unit coverage for YTD target multiplication, active-role inclusion, filter-independent month comparison/WIN-OR-DIE, canonical project visibility, component relocation, PDF removal, and collapsed inactive pipeline records.
- Run `test:report`, `test:contracts`, lint, and production build before commit/push.
