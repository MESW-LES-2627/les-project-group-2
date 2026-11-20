-- US-3.5: proposers can edit and delete their own proposed pins.
-- The pins table originally had no UPDATE/DELETE policies, so those actions
-- silently affected zero rows under RLS. Organizers keep broader access via
-- the existing "Trip organizers can update pins" policy and the new delete one.
drop policy if exists "Pin creators can update proposed pins" on public.pins;
create policy "Pin creators can update proposed pins"
    on public.pins
    for update
    to authenticated
    using (
        is_confirmed = false
        and (
            proposed_by = (select auth.jwt() ->> 'email')
            or proposed_by = (select auth.uid())::text
        )
    )
    with check (
        is_confirmed = false
        and (
            proposed_by = (select auth.jwt() ->> 'email')
            or proposed_by = (select auth.uid())::text
        )
    );

drop policy if exists "Pin creators can delete proposed pins" on public.pins;
create policy "Pin creators can delete proposed pins"
    on public.pins
    for delete
    to authenticated
    using (
        is_confirmed = false
        and (
            proposed_by = (select auth.jwt() ->> 'email')
            or proposed_by = (select auth.uid())::text
        )
    );

drop policy if exists "Trip organizers can delete pins" on public.pins;
create policy "Trip organizers can delete pins"
    on public.pins
    for delete
    to authenticated
    using (public.is_trip_organizer(trip_id));
