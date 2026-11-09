import pandas as pd

# Load
df = pd.read_csv('data/power_daily_full.csv', low_memory=False)
print(f"Before: {len(df)} rows, {df['name'].nunique()} municipalities")

# Deduplicate on (name, province, date)
df = df.drop_duplicates(subset=['name', 'province', 'date'], keep='first')
print(f"After:  {len(df)} rows, {df['name'].nunique()} municipalities")

# Validate
if df['name'].nunique() != 114:
    print(f"⚠️  WARNING: Expected 114 municipalities, got {df['name'].nunique()}")
    print(df['name'].value_counts().head(20))

# Save
df.to_csv('data/power_daily_full.csv', index=False)
print("✅ Saved cleaned CSV")