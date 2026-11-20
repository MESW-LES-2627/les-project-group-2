-- Organizers must be able to confirm/revert proposed pins (US-3.3).
-- The original pins table only had SELECT and INSERT policies, so the
-- confirm/revert UPDATE silently affected zero rows under RLS.
drop policy if exists "Trip organizers can update pins" on public.pins;
create policy "Trip organizers can update pins"
    on public.pins
    for update
    to authenticated
    using (public.is_trip_organizer(trip_id))
    with check (public.is_trip_organizer(trip_id));
