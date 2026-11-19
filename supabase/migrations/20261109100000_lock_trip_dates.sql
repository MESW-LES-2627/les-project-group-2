-- Lock the official trip dates (US-2.3)
alter table public.trips
    add column if not exists locked_start_date date,
    add column if not exists locked_end_date date;

alter table public.trips drop constraint if exists trips_locked_dates_check;
alter table public.trips
    add constraint trips_locked_dates_check check (
        (locked_start_date is null and locked_end_date is null)
        or (
            locked_start_date is not null
            and locked_end_date is not null
            and locked_end_date >= locked_start_date
        )
    );

-- One itinerary day per day of the locked range
create table if not exists public.trip_itinerary_days (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips(id) on delete cascade,
    day date not null,
    created_at timestamptz not null default now(),
    constraint trip_itinerary_days_unique_day unique (trip_id, day)
);

alter table public.trip_itinerary_days enable row level security;

revoke all on public.trip_itinerary_days from public, anon, authenticated;
grant select on public.trip_itinerary_days to authenticated;
grant all on public.trip_itinerary_days to service_role;

drop policy if exists "Trip members can view itinerary days" on public.trip_itinerary_days;
create policy "Trip members can view itinerary days"
    on public.trip_itinerary_days
    for select
    to authenticated
    using (public.is_trip_member(trip_id));

-- True when the organizer has locked the dates of the trip.
create or replace function public.is_trip_dates_locked(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.trips
        where id = p_trip_id
          and locked_start_date is not null
    );
$$;

revoke all on function public.is_trip_dates_locked(uuid) from public, anon;
grant execute on function public.is_trip_dates_locked(uuid) to authenticated;

-- Locks the dates, creates the itinerary days and updates the trip state atomically.
create or replace function public.lock_trip_dates(p_trip_id uuid, p_start date, p_end date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not public.is_trip_organizer(p_trip_id) then
        raise exception 'Only the organizer can lock the trip dates.';
    end if;

    if p_start is null or p_end is null or p_end < p_start then
        raise exception 'The end date cannot be before the start date.';
    end if;

    if public.is_trip_dates_locked(p_trip_id) then
        raise exception 'The trip dates are already locked.';
    end if;

    if exists (
        select 1
        from generate_series(p_start::timestamp, p_end::timestamp, interval '1 day') as days(day)
        where not public.is_day_in_trip_window(p_trip_id, days.day::date)
    ) then
        raise exception 'The locked dates must be inside the candidate date windows.';
    end if;

    update public.trips
    set locked_start_date = p_start,
        locked_end_date = p_end,
        state = 'Dates locked',
        updated_at = now()
    where id = p_trip_id;

    insert into public.trip_itinerary_days (trip_id, day)
    select p_trip_id, days.day::date
    from generate_series(p_start::timestamp, p_end::timestamp, interval '1 day') as days(day);
end;
$$;

-- Unlocks the dates and removes the itinerary days created by the lock.
create or replace function public.unlock_trip_dates(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if not public.is_trip_organizer(p_trip_id) then
        raise exception 'Only the organizer can unlock the trip dates.';
    end if;

    if not public.is_trip_dates_locked(p_trip_id) then
        raise exception 'The trip dates are not locked.';
    end if;

    delete from public.trip_itinerary_days where trip_id = p_trip_id;

    update public.trips
    set locked_start_date = null,
        locked_end_date = null,
        state = 'Planning',
        updated_at = now()
    where id = p_trip_id;
end;
$$;

revoke all on function public.lock_trip_dates(uuid, date, date) from public, anon;
revoke all on function public.unlock_trip_dates(uuid) from public, anon;
grant execute on function public.lock_trip_dates(uuid, date, date) to authenticated;
grant execute on function public.unlock_trip_dates(uuid) to authenticated;

-- Candidate windows can only be changed while the dates are not locked (US-2.1).
drop policy if exists "Organizers can add date windows" on public.trip_date_windows;
create policy "Organizers can add date windows"
    on public.trip_date_windows
    for insert
    to authenticated
    with check (
        public.is_trip_organizer(trip_id)
        and created_by = (select auth.uid())
        and not public.is_trip_dates_locked(trip_id)
    );

drop policy if exists "Organizers can edit date windows" on public.trip_date_windows;
create policy "Organizers can edit date windows"
    on public.trip_date_windows
    for update
    to authenticated
    using (
        public.is_trip_organizer(trip_id)
        and not public.is_trip_dates_locked(trip_id)
    )
    with check (
        public.is_trip_organizer(trip_id)
        and not public.is_trip_dates_locked(trip_id)
    );

drop policy if exists "Organizers can delete date windows" on public.trip_date_windows;
create policy "Organizers can delete date windows"
    on public.trip_date_windows
    for delete
    to authenticated
    using (
        public.is_trip_organizer(trip_id)
        and not public.is_trip_dates_locked(trip_id)
    );

-- Members can no longer change their availability once the dates are locked (US-2.2).
drop policy if exists "Members can submit their own availability" on public.trip_availability;
create policy "Members can submit their own availability"
    on public.trip_availability
    for insert
    to authenticated
    with check (
        user_id = (select auth.uid())
        and public.is_trip_member(trip_id)
        and public.is_day_in_trip_window(trip_id, day)
        and not public.is_trip_dates_locked(trip_id)
    );

drop policy if exists "Members can change their own availability" on public.trip_availability;
create policy "Members can change their own availability"
    on public.trip_availability
    for update
    to authenticated
    using (
        user_id = (select auth.uid())
        and not public.is_trip_dates_locked(trip_id)
    )
    with check (
        user_id = (select auth.uid())
        and public.is_trip_member(trip_id)
        and public.is_day_in_trip_window(trip_id, day)
        and not public.is_trip_dates_locked(trip_id)
    );

drop policy if exists "Members can clear their own availability" on public.trip_availability;
create policy "Members can clear their own availability"
    on public.trip_availability
    for delete
    to authenticated
    using (
        user_id = (select auth.uid())
        and not public.is_trip_dates_locked(trip_id)
    );
