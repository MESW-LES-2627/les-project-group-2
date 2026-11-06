-- Candidate date windows proposed by the trip organizer (US-2.1)
create table if not exists public.trip_date_windows (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips(id) on delete cascade,
    start_date date not null,
    end_date date not null,
    created_by uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint trip_date_windows_end_after_start check (end_date >= start_date)
);

create index if not exists trip_date_windows_trip_id_idx
    on public.trip_date_windows (trip_id, start_date);

alter table public.trip_date_windows enable row level security;

revoke all on public.trip_date_windows from public, anon, authenticated;
grant select, insert, update, delete on public.trip_date_windows to authenticated;
grant all on public.trip_date_windows to service_role;

drop policy if exists "Trip members can view date windows" on public.trip_date_windows;
create policy "Trip members can view date windows"
    on public.trip_date_windows
    for select
    to authenticated
    using (public.is_trip_member(trip_id));

drop policy if exists "Organizers can add date windows" on public.trip_date_windows;
create policy "Organizers can add date windows"
    on public.trip_date_windows
    for insert
    to authenticated
    with check (
        public.is_trip_organizer(trip_id)
        and created_by = (select auth.uid())
    );

drop policy if exists "Organizers can edit date windows" on public.trip_date_windows;
create policy "Organizers can edit date windows"
    on public.trip_date_windows
    for update
    to authenticated
    using (public.is_trip_organizer(trip_id))
    with check (public.is_trip_organizer(trip_id));

drop policy if exists "Organizers can delete date windows" on public.trip_date_windows;
create policy "Organizers can delete date windows"
    on public.trip_date_windows
    for delete
    to authenticated
    using (public.is_trip_organizer(trip_id));
