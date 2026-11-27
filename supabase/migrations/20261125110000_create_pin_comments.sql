-- Comments on proposed pins so the group can discuss a place before voting (US-3.6)
create table if not exists public.pin_comments (
    id uuid primary key default gen_random_uuid(),
    pin_id uuid not null references public.pins(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    author_name text not null,
    body text not null,
    created_at timestamptz not null default now(),
    constraint pin_comments_body_length check (char_length(btrim(body)) between 1 and 1000)
);

create index if not exists pin_comments_pin_id_idx
    on public.pin_comments (pin_id, created_at);

alter table public.pin_comments enable row level security;

revoke all on public.pin_comments from public, anon, authenticated;
grant select, insert, delete on public.pin_comments to authenticated;
grant all on public.pin_comments to service_role;

-- Only members of the pin's trip can read the comments.
drop policy if exists "Trip members can view pin comments" on public.pin_comments;
create policy "Trip members can view pin comments"
    on public.pin_comments
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.pins p
            where p.id = pin_comments.pin_id
              and public.is_trip_member(p.trip_id)
        )
    );

-- Members comment as themselves, on pins of their own trips.
drop policy if exists "Trip members can comment on pins" on public.pin_comments;
create policy "Trip members can comment on pins"
    on public.pin_comments
    for insert
    to authenticated
    with check (
        user_id = (select auth.uid())
        and exists (
            select 1
            from public.pins p
            where p.id = pin_comments.pin_id
              and public.is_trip_member(p.trip_id)
        )
    );

-- Authors can delete their own comments, which removes them for every member.
drop policy if exists "Authors can delete their pin comments" on public.pin_comments;
create policy "Authors can delete their pin comments"
    on public.pin_comments
    for delete
    to authenticated
    using (user_id = (select auth.uid()));
