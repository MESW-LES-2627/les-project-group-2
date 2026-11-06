-- Member availability for the days inside the candidate date windows (US-2.2)
create table if not exists public.trip_availability (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    day date not null,
    status text not null check (status in ('available', 'unavailable')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint trip_availability_unique_answer unique (trip_id, user_id, day)
);

create index if not exists trip_availability_trip_id_idx
    on public.trip_availability (trip_id, day);

-- True when the day falls inside at least one candidate window of the trip.
create or replace function public.is_day_in_trip_window(p_trip_id uuid, p_day date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.trip_date_windows
        where trip_id = p_trip_id
          and p_day between start_date and end_date
    );
$$;

revoke all on function public.is_day_in_trip_window(uuid, date) from public, anon;
grant execute on function public.is_day_in_trip_window(uuid, date) to authenticated;

alter table public.trip_availability enable row level security;

revoke all on public.trip_availability from public, anon, authenticated;
grant select, insert, update, delete on public.trip_availability to authenticated;
grant all on public.trip_availability to service_role;

drop policy if exists "Trip members can view availability" on public.trip_availability;
create policy "Trip members can view availability"
    on public.trip_availability
    for select
    to authenticated
    using (public.is_trip_member(trip_id));

drop policy if exists "Members can submit their own availability" on public.trip_availability;
create policy "Members can submit their own availability"
    on public.trip_availability
    for insert
    to authenticated
    with check (
        user_id = (select auth.uid())
        and public.is_trip_member(trip_id)
        and public.is_day_in_trip_window(trip_id, day)
    );

drop policy if exists "Members can change their own availability" on public.trip_availability;
create policy "Members can change their own availability"
    on public.trip_availability
    for update
    to authenticated
    using (user_id = (select auth.uid()))
    with check (
        user_id = (select auth.uid())
        and public.is_trip_member(trip_id)
        and public.is_day_in_trip_window(trip_id, day)
    );

drop policy if exists "Members can clear their own availability" on public.trip_availability;
create policy "Members can clear their own availability"
    on public.trip_availability
    for delete
    to authenticated
    using (user_id = (select auth.uid()));

-- US-2.1: when a window is edited or deleted, availability outside every
-- remaining window of the trip is removed for all members.
create or replace function public.prune_availability_outside_windows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    delete from public.trip_availability as availability
    where availability.trip_id = old.trip_id
      and not exists (
          select 1
          from public.trip_date_windows as windows
          where windows.trip_id = availability.trip_id
            and availability.day between windows.start_date and windows.end_date
      );
    return null;
end;
$$;

revoke all on function public.prune_availability_outside_windows() from public, anon, authenticated;

drop trigger if exists trip_date_windows_prune_availability on public.trip_date_windows;
create trigger trip_date_windows_prune_availability
    after update or delete on public.trip_date_windows
    for each row
    execute function public.prune_availability_outside_windows();
