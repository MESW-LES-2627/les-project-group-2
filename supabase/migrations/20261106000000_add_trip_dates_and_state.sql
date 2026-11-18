-- Add state column to trips
alter table public.trips add column if not exists state text not null default 'Planning';

-- Drop obsolete trip_dates table if it exists
drop table if exists public.trip_dates cascade;
