---
description: Scaffold the React vs Recharts analytics builder step — 3 charts from FACT_Pharmacy_Sales (area, bar, donut) using the star-schema OLAP rules
---

# build-analytics — Build the Analytics Dashboard Charts

Use the `react-architect` subagent to decide the implementation strategy, then build
the 3 analytics charts below using the `recharts-olap` and `supabase-crud` skills.

## Context

The "Analytics" page already exists for the Admin role. The analytics data is defined
in a DB star schema built with the Dashboard Design rules:
`DIM_Date`, `DIM_Drug`, and the central fact table `FACT_Pharmacy_Sales`.

## Fact Table Contract (must not be changed)

- One row per line item on each prescription order
- `Patient_Key` (FK to users), `Drug_Key` (FK to DIM_Drug), `Date_Key` (int YYYYMMDD) — all required
- `Dispensed_Flag`: `true` = dispensed, `false` = cancelled

## The 3 Charts

1. **Area chart — Monthly Completed vs Cancelled orders**
   - X: month, from `DIM_Date.Month`, grouping by `FACT_Pharmacy_Sales.Date_Key`
   - Y: count of `Dispensed_Flag = true` vs `count of Dispensed_Flag = false`, two <Area> series
2. **Bar chart — Daily order velocity**
   - One data point per day from the last 7 days, `count(*)`
3. **Donut — DIM_Drug.Category therapeutic class mix**
   - `PieChart` with `innerRadius={60}`, `outerRadius={80}`, color per category per the recharts-olap skill

## Build Sequence

1. Get the strategy from `react-architect`
2. Write the Supabase queries against the fact + dim tables
3. Transform rows to the OLAP `[{ name, value }]` shapes per the recharts-olap skill
4. Implement the `Analytics` charts with recharts
5. Review with the `react-reviewer` subagent + `typescript-reviewer`
6. Run `npm run build` and `npx tsc --noEmit` for verification