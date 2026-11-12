---
name: supabase-crud
description: Supabase CRUD rules for this Pharmacy app's star schema. Use when executing Create/Update/Delete operations on FACT_Pharmacy_Sales or any Supabase mutations in the pharmacy web application.
---

# Supabase CRUD for Star Schema

When executing Create, Update, or Delete operations on the Pharmacy web app:

1. **Orders (Storefront Checkout):**
   - Insert exactly ONE row into `FACT_Pharmacy_Sales` per item.
   - Required fields: `Patient_Key` (from active session), `Drug_Key` (from cart), `Date_Key` (current date formatted as YYYYMMDD integer), and `Dispensed_Flag = true`.
2. **Cancellations (Patient Dashboard):**
   - Do NOT use `DELETE FROM`.
   - Use `UPDATE FACT_Pharmacy_Sales SET Dispensed_Flag = false WHERE Prescription_ID = [id]`.
3. **RLS Bypass:** Assume Row Level Security (RLS) is handled by the provided `VITE_SUPABASE_ANON_KEY`. Use standard `.select()`, `.insert()`, and `.update()` methods from the Supabase JS client.