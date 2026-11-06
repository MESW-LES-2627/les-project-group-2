-- Keep the profile UI's account-deletion RPC reproducible after a clean reset.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    caller_id uuid := auth.uid();
begin
    if caller_id is null then
        raise exception 'Authentication required' using errcode = '42501';
    end if;

    -- The caller cannot supply another user's ID. Application foreign keys
    -- cascade the caller's profiles, memberships, and organizer-owned trips.
    delete from auth.users where id = caller_id;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
