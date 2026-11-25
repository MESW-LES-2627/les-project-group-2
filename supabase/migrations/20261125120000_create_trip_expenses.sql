-- Shared expenses of a trip, split equally between the chosen participants (US-5.1)
create table if not exists public.trip_expenses (
    id uuid primary key default gen_random_uuid(),
    trip_id uuid not null references public.trips(id) on delete cascade,
    description text not null,
    amount_cents integer not null,
    paid_by uuid not null references auth.users(id) on delete cascade,
    created_by uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint trip_expenses_description_length check (char_length(btrim(description)) between 1 and 200),
    constraint trip_expenses_amount_range check (amount_cents between 1 and 100000000)
);

create index if not exists trip_expenses_trip_id_idx
    on public.trip_expenses (trip_id, created_at desc);

-- What each participant owes for an expense. The shares of an expense always add up to its amount.
create table if not exists public.trip_expense_participants (
    expense_id uuid not null references public.trip_expenses(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    share_cents integer not null,
    primary key (expense_id, user_id),
    constraint trip_expense_participants_share_not_negative check (share_cents >= 0)
);

alter table public.trip_expenses enable row level security;
alter table public.trip_expense_participants enable row level security;

-- Expenses are written only through the functions below, so the shares can never drift from the amount.
revoke all on public.trip_expenses from public, anon, authenticated;
revoke all on public.trip_expense_participants from public, anon, authenticated;
grant select on public.trip_expenses to authenticated;
grant select on public.trip_expense_participants to authenticated;
grant all on public.trip_expenses to service_role;
grant all on public.trip_expense_participants to service_role;

drop policy if exists "Trip members can view expenses" on public.trip_expenses;
create policy "Trip members can view expenses"
    on public.trip_expenses
    for select
    to authenticated
    using (public.is_trip_member(trip_id));

drop policy if exists "Trip members can view expense participants" on public.trip_expense_participants;
create policy "Trip members can view expense participants"
    on public.trip_expense_participants
    for select
    to authenticated
    using (
        exists (
            select 1
            from public.trip_expenses e
            where e.id = trip_expense_participants.expense_id
              and public.is_trip_member(e.trip_id)
        )
    );

-- Creates an expense (p_expense_id null) or edits one, and splits it equally between the participants.
-- Cents that cannot be split evenly go to the first participants, so the shares add up to the amount.
create or replace function public.save_trip_expense(
    p_trip_id uuid,
    p_expense_id uuid,
    p_description text,
    p_amount_cents integer,
    p_paid_by uuid,
    p_participants uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_caller uuid := (select auth.uid());
    v_expense_id uuid := p_expense_id;
    v_participants uuid[];
    v_count integer;
    v_existing public.trip_expenses%rowtype;
begin
    if v_caller is null or not public.is_trip_member(p_trip_id) then
        raise exception 'Only trip members can manage expenses.';
    end if;

    if p_description is null or char_length(btrim(p_description)) not between 1 and 200 then
        raise exception 'The description must have between 1 and 200 characters.';
    end if;

    if p_amount_cents is null or p_amount_cents < 1 or p_amount_cents > 100000000 then
        raise exception 'The amount must be greater than zero.';
    end if;

    select coalesce(array_agg(distinct participant order by participant), '{}')
    into v_participants
    from unnest(coalesce(p_participants, '{}')) as participant;

    v_count := cardinality(v_participants);
    if v_count = 0 then
        raise exception 'Choose at least one participant.';
    end if;

    if p_paid_by is null
       or not exists (select 1 from public.trip_members where trip_id = p_trip_id and user_id = p_paid_by) then
        raise exception 'The payer must be a member of the trip.';
    end if;

    if exists (
        select 1
        from unnest(v_participants) as participant
        where not exists (
            select 1 from public.trip_members where trip_id = p_trip_id and user_id = participant
        )
    ) then
        raise exception 'Every participant must be a member of the trip.';
    end if;

    if v_expense_id is null then
        insert into public.trip_expenses (trip_id, description, amount_cents, paid_by, created_by)
        values (p_trip_id, btrim(p_description), p_amount_cents, p_paid_by, v_caller)
        returning id into v_expense_id;
    else
        select * into v_existing
        from public.trip_expenses
        where id = v_expense_id and trip_id = p_trip_id
        for update;

        if not found then
            raise exception 'The expense does not exist.';
        end if;

        if v_existing.paid_by <> v_caller and not public.is_trip_organizer(p_trip_id) then
            raise exception 'Only the payer or the organizer can edit this expense.';
        end if;

        update public.trip_expenses
        set description = btrim(p_description),
            amount_cents = p_amount_cents,
            paid_by = p_paid_by,
            updated_at = now()
        where id = v_expense_id;

        delete from public.trip_expense_participants where expense_id = v_expense_id;
    end if;

    insert into public.trip_expense_participants (expense_id, user_id, share_cents)
    select
        v_expense_id,
        participant,
        p_amount_cents / v_count + case when idx <= p_amount_cents % v_count then 1 else 0 end
    from unnest(v_participants) with ordinality as t(participant, idx);

    return v_expense_id;
end;
$$;

-- Deletes an expense and its shares. Only the payer or the trip organizer can do it.
create or replace function public.delete_trip_expense(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_expense public.trip_expenses%rowtype;
begin
    select * into v_expense from public.trip_expenses where id = p_expense_id for update;

    if not found or not public.is_trip_member(v_expense.trip_id) then
        raise exception 'The expense does not exist.';
    end if;

    if v_expense.paid_by <> (select auth.uid()) and not public.is_trip_organizer(v_expense.trip_id) then
        raise exception 'Only the payer or the organizer can delete this expense.';
    end if;

    delete from public.trip_expenses where id = p_expense_id;
end;
$$;

revoke all on function public.save_trip_expense(uuid, uuid, text, integer, uuid, uuid[]) from public, anon;
revoke all on function public.delete_trip_expense(uuid) from public, anon;
grant execute on function public.save_trip_expense(uuid, uuid, text, integer, uuid, uuid[]) to authenticated;
grant execute on function public.delete_trip_expense(uuid) to authenticated;
