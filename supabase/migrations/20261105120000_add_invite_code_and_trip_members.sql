-- Add invite_code column to trips table
alter table public.trips
add column if not exists invite_code text unique;

-- Create trip_members table
create table if not exists public.trip_members (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'member' check (role in ('organizer', 'member')),
    joined_at timestamp with time zone not null default now(),
    constraint unique_trip_member unique (trip_id, user_id)
);

-- Enable Row Level Security (RLS)
alter table public.trip_members enable row level security;

-- Policies for public.trip_members
create policy "Authenticated users can view trip members"
    on public.trip_members
    for select
    to authenticated
    using (true);

create policy "Users can join trips as members"
    on public.trip_members
    for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "Trip members can remove themselves or organizers can remove members"
    on public.trip_members
    for delete
    to authenticated
    using (
        auth.uid() = user_id
        or exists (
            select 1 from public.trips
            where trips.id = trip_members.trip_id
            and trips.organizer_id = auth.uid()
        )
    );

-- Permissions
grant all on table public.trip_members to authenticated;
grant all on table public.trip_members to service_role;
