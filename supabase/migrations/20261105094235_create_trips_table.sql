-- Create trips table
create table if not exists public.trips (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    destination text,
    description text,
    organizer_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.trips enable row level security;

-- Policies for public.trips
create policy "Authenticated users can view trips"
    on public.trips
    for select
    to authenticated
    using (true);

create policy "Users can insert their own trips"
    on public.trips
    for insert
    to authenticated
    with check (auth.uid() = organizer_id);

create policy "Users can update their own trips"
    on public.trips
    for update
    to authenticated
    using (auth.uid() = organizer_id)
    with check (auth.uid() = organizer_id);

create policy "Users can delete their own trips"
    on public.trips
    for delete
    to authenticated
    using (auth.uid() = organizer_id);

-- Permissions
grant all on table public.trips to authenticated;
grant all on table public.trips to service_role;
