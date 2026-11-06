-- Create pins table
create table if not exists public.pins (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips(id) on delete cascade,
    name text not null,
    description text,
    date text,
    category text not null default 'sightseeing',
    lat double precision not null,
    lng double precision not null,
    proposed_by text not null,
    created_at timestamp with time zone not null default now()
);

-- Create pin_votes table
create table if not exists public.pin_votes (
    id uuid primary key default gen_random_uuid(),
    pin_id uuid not null references public.pins(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    user_email text not null,
    trip_date text,
    created_at timestamp with time zone not null default now(),
    constraint unique_pin_user_date unique nulls not distinct (pin_id, user_id, trip_date)
);

-- Enable Row Level Security (RLS)
alter table public.pins enable row level security;
alter table public.pin_votes enable row level security;

-- Policies for public.pins
create policy "Authenticated users can view pins"
    on public.pins
    for select
    to authenticated
    using (true);

create policy "Authenticated users can insert pins"
    on public.pins
    for insert
    to authenticated
    with check (true);

-- Policies for public.pin_votes
create policy "Authenticated users can view pin votes"
    on public.pin_votes
    for select
    to authenticated
    using (true);

create policy "Authenticated users can cast pin votes"
    on public.pin_votes
    for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Authenticated users can remove their own pin votes"
    on public.pin_votes
    for delete
    to authenticated
    using (auth.uid() = user_id);

-- Permissions
grant all on table public.pins to authenticated;
grant all on table public.pins to service_role;
grant all on table public.pin_votes to authenticated;
grant all on table public.pin_votes to service_role;
