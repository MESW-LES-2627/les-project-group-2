create table if not exists public.trip_members (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'member' check (role in ('organizer', 'member')),
    joined_at timestamptz not null default now(),
    constraint unique_trip_member unique (trip_id, user_id)
);

create unique index if not exists trip_members_one_organizer_per_trip
    on public.trip_members (trip_id)
    where role = 'organizer';

insert into public.trip_members (trip_id, user_id, role)
select id, organizer_id, 'organizer'
from public.trips
on conflict (trip_id, user_id) do update
set role = 'organizer';

create function public.add_trip_organizer_as_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.trip_members (trip_id, user_id, role)
    values (new.id, new.organizer_id, 'organizer');
    return new;
end;
$$;

drop trigger if exists trips_add_organizer_membership on public.trips;
create trigger trips_add_organizer_membership
    after insert on public.trips
    for each row
    execute function public.add_trip_organizer_as_member();

create function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select exists (
        select 1
        from public.trip_members
        where trip_id = p_trip_id
          and user_id = (select auth.uid())
    );
$$;

create function public.is_trip_organizer(p_trip_id uuid)
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
          and organizer_id = (select auth.uid())
    );
$$;

create function public.get_trip_members(p_trip_id uuid)
returns table (
    user_id uuid,
    email text,
    display_name text,
    role text
)
language sql
stable
security definer
set search_path = ''
as $$
    select
        users.id,
        users.email,
        coalesce(
            nullif(users.raw_user_meta_data ->> 'full_name', ''),
            nullif(users.raw_user_meta_data ->> 'name', ''),
            users.email,
            'Trip member'
        ),
        memberships.role
    from public.trip_members as memberships
    join auth.users as users on users.id = memberships.user_id
    where memberships.trip_id = p_trip_id
      and public.is_trip_member(p_trip_id)
    order by (memberships.role = 'organizer') desc, 3;
$$;

revoke all on function public.add_trip_organizer_as_member() from public, anon, authenticated;
revoke all on function public.is_trip_member(uuid) from public, anon;
revoke all on function public.is_trip_organizer(uuid) from public, anon;
revoke all on function public.get_trip_members(uuid) from public, anon;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.is_trip_organizer(uuid) to authenticated;
grant execute on function public.get_trip_members(uuid) to authenticated;

alter table public.trip_members enable row level security;

revoke all on public.trip_members from public, anon, authenticated;
grant select, insert, delete on public.trip_members to authenticated;
grant all on public.trip_members to service_role;

drop policy if exists "Authenticated users can view trip members" on public.trip_members;
drop policy if exists "Users can join trips as members" on public.trip_members;
drop policy if exists "Trip members can remove themselves or organizers can remove members" on public.trip_members;
drop policy if exists "Trip members can view membership" on public.trip_members;
create policy "Trip members can view membership"
    on public.trip_members
    for select
    to authenticated
    using (public.is_trip_member(trip_id));

create policy "Users can join trips as members"
    on public.trip_members
    for insert
    to authenticated
    with check (
        user_id = (select auth.uid())
        and role = 'member'
    );

drop policy if exists "Organizers can remove trip members and members can leave" on public.trip_members;
create policy "Organizers can remove trip members and members can leave"
    on public.trip_members
    for delete
    to authenticated
    using (
        role = 'member'
        and (
            user_id = (select auth.uid())
            or public.is_trip_organizer(trip_id)
        )
    );
