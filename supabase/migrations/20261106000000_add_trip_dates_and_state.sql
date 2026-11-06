-- Add state column to trips
alter table public.trips add column if not exists state text not null default 'Planning';

-- Create trip_dates table
create table if not exists public.trip_dates (
  trip_id uuid not null references public.trips(id) on delete cascade,
  event text,
  date_itself timestamptz not null default now(),
  date_id uuid primary key not null default gen_random_uuid()
);

-- Enable Row Level Security (RLS)
alter table public.trip_dates enable row level security;

-- Policy: all authenticated users can see trip_dates
create policy "all can see trip_dates"
  on public.trip_dates
  for select
  to anon, authenticated
  using (true);
