-- Policy to allow trip organizers to delete pins
drop policy if exists "Organizers can delete pins" on public.pins;
create policy "Organizers can delete pins"
    on public.pins
    for delete
    to authenticated
    using (
        exists (
            select 1 from public.trips
            where trips.id = pins.trip_id
            and trips.organizer_id = auth.uid()
        )
    );
