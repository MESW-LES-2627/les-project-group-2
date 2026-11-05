--Create trips table
create table if not exists public.trip_dates (
  trip uuid not null default gen_random_uuid() references public.trips(id) on delete cascade,
  event text,
  date_itself timestampz not null default now(),
  date_id uuid primary key not null default gen_random_uuid() 
);

-- Enable Row Level Security (RLS)
alter table public.trip_dates enable row level security;

-- Policy
create policy "all can see trip_dates"
  on public.trip_dates
  for select
  to anon, authenticated
  using (true);
