---
name: recharts-olap
description: Recharts + OLAP data transformation rules for dashboards built on the Supabase star schema (FACT_Pharmacy_Sales + DIM_*). Use when building Recharts area/line/bar/pie/donut charts from Supabase queries in this app.
---

# Recharts & OLAP Integration Rules

When building dashboard analytics from the Supabase Star Schema (`FACT_Pharmacy_Sales` + `DIM_*` tables), follow these data transformation rules:

1. **Recharts Data Format:** Recharts expects arrays of objects. Always map Supabase JSON responses to this format: `[{ name: 'Category', value: 100 }, ...]`.
2. **Handling Time Series:** For area and line charts (e.g., Monthly Orders vs. Cancellations), group data by `Date_Key` or `DIM_Date.Month`. Count `Dispensed_Flag = true` as Completed and `Dispensed_Flag = false` as Cancelled.
3. **Donut Charts:** For formulary distribution, use Recharts `<PieChart>` and `<Pie>`. Set `innerRadius={60}` and `outerRadius={80}` to create the donut effect shown in the UI. Group counts by `DIM_Drug.Category`.
4. **Color Mapping:** Map specific therapeutic categories to consistent hex codes (e.g., Cardiovascular = Blue, Diabetes = Cyan, Pain = Green, Respiratory = Purple).