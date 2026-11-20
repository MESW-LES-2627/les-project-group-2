-- Promote a trip member to organizer and demote the current organizer (US-1.6)

create or replace function public.promote_to_organizer(p_trip_id uuid, p_new_organizer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_current_organizer_id uuid;
begin
    -- Only the current organizer can transfer the organizer role
    if not public.is_trip_organizer(p_trip_id) then
        raise exception 'Only the organizer can transfer organizer privileges.';
    end if;

    -- Fetch current organizer id
    select organizer_id into v_current_organizer_id
    from public.trips
    where id = p_trip_id;

    if v_current_organizer_id is null then
        raise exception 'Trip not found.';
    end if;

    if v_current_organizer_id = p_new_organizer_id then
        raise exception 'User is already the trip organizer.';
    end if;

    -- Verify that the target user is currently a member of the trip
    if not exists (
        select 1
        from public.trip_members
        where trip_id = p_trip_id
          and user_id = p_new_organizer_id
          and role = 'member'
    ) then
        raise exception 'Target user is not a member of this trip.';
    end if;

    -- In trip_members, demote current organizer to member
    update public.trip_members
    set role = 'member'
    where trip_id = p_trip_id
      and user_id = v_current_organizer_id;

    -- In trip_members, promote new organizer
    update public.trip_members
    set role = 'organizer'
    where trip_id = p_trip_id
      and user_id = p_new_organizer_id;

    -- In trips, update organizer_id
    update public.trips
    set organizer_id = p_new_organizer_id,
        updated_at = now()
    where id = p_trip_id;
end;
$$;

revoke all on function public.promote_to_organizer(uuid, uuid) from public, anon;
grant execute on function public.promote_to_organizer(uuid, uuid) to authenticated;
