-- Add commited column to pins table (US-3.3)
alter table public.pins
add column if not exists commited boolean not null default false;

-- Policy to allow trip organizers to update pins (e.g., toggling commited status)
drop policy if exists "Organizers can update pins" on public.pins;
create policy "Organizers can update pins"
    on public.pins
    for update
    to authenticated
    using (
        exists (
            select 1 from public.trips
            where trips.id = pins.trip_id
            and trips.organizer_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1 from public.trips
            where trips.id = pins.trip_id
            and trips.organizer_id = auth.uid()
        )
    );
