-- Enable PostGIS extension
create extension if not exists postgis;

-- 1. Municipalities table (Region V - Bicol)
create table if not exists public.municipalities (
    id serial primary key,
    name text not null,
    province text not null,
    psgc_code text unique,
    geom geometry(MultiPolygon, 4326),
    elevation float,
    coast_dist_km float,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PostGIS function for clean Lat/Lon centroid extraction
create or replace function public.get_clean_municipality_latlon()
returns table (
    id int,
    name text,
    province text,
    lat float,
    lon float
) 
language sql
security definer
as $$
    select 
        id,
        name,
        province,
        st_y(st_centroid(geom)) as lat,
        st_x(st_centroid(geom)) as lon
    from public.municipalities;
$$;

-- 2. Climate Time Series & Anomalies table
create table if not exists public.climate_anomalies (
    id serial primary key,
    municipality_id int references public.municipalities(id) on delete cascade,
    year int not null,
    heat_index float not null,
    anomaly float not null,
    significant boolean default false,
    sample_count int default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Driver Features & Verdant / Canopy table
create table if not exists public.driver_features (
    id serial primary key,
    municipality_id int references public.municipalities(id) on delete cascade,
    canopy_cover_pct float,
    lst_mean float,
    driver_rank_primary text,
    shap_value float,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.municipalities enable row level security;
alter table public.climate_anomalies enable row level security;
alter table public.driver_features enable row level security;

-- Create public read policies for prototype
create policy "Allow public read on municipalities" on public.municipalities for select using (true);
create policy "Allow public read on climate_anomalies" on public.climate_anomalies for select using (true);
create policy "Allow public read on driver_features" on public.driver_features for select using (true);
