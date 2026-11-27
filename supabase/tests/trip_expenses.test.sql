begin;

create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email) values
    ('00000000-0000-4000-a000-000000000031', 'expense-organizer@example.test'),
    ('00000000-0000-4000-a000-000000000032', 'expense-ana@example.test'),
    ('00000000-0000-4000-a000-000000000033', 'expense-bruno@example.test'),
    ('00000000-0000-4000-a000-000000000034', 'expense-outsider@example.test');

insert into public.trips (id, name, organizer_id) values
    ('00000000-0000-4000-b000-000000000031', 'Expense test', '00000000-0000-4000-a000-000000000031');
insert into public.trip_members (trip_id, user_id) values
    ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-a000-000000000032'),
    ('00000000-0000-4000-b000-000000000031', '00000000-0000-4000-a000-000000000033');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000032';

select lives_ok($$
    select public.save_trip_expense(
        '00000000-0000-4000-b000-000000000031', null, 'Dinner', 1000,
        '00000000-0000-4000-a000-000000000032',
        array['00000000-0000-4000-a000-000000000031', '00000000-0000-4000-a000-000000000032',
              '00000000-0000-4000-a000-000000000033']::uuid[])
$$, 'A member can log an expense shared by every member');

select is(
    (select array_agg(share_cents order by share_cents desc) from public.trip_expense_participants),
    array[334, 333, 333], 'The expense is split equally and the extra cent goes to the first participant'
);

select is(
    (select sum(share_cents)::integer from public.trip_expense_participants),
    1000, 'The shares add up to the amount'
);

select throws_ok($$
    select public.save_trip_expense(
        '00000000-0000-4000-b000-000000000031', null, 'Free lunch', 0,
        '00000000-0000-4000-a000-000000000032',
        array['00000000-0000-4000-a000-000000000032']::uuid[])
$$, 'P0001', 'The amount must be greater than zero.', 'An amount of zero is rejected');

select throws_ok($$
    select public.save_trip_expense(
        '00000000-0000-4000-b000-000000000031', null, '   ', 100,
        '00000000-0000-4000-a000-000000000032',
        array['00000000-0000-4000-a000-000000000032']::uuid[])
$$, 'P0001', 'The description must have between 1 and 200 characters.', 'An empty description is rejected');

select throws_ok($$
    select public.save_trip_expense(
        '00000000-0000-4000-b000-000000000031', null, 'Nobody', 100,
        '00000000-0000-4000-a000-000000000032', array[]::uuid[])
$$, 'P0001', 'Choose at least one participant.', 'An expense needs at least one participant');

select throws_ok($$
    select public.save_trip_expense(
        '00000000-0000-4000-b000-000000000031', null, 'Outsider pays', 100,
        '00000000-0000-4000-a000-000000000034',
        array['00000000-0000-4000-a000-000000000032']::uuid[])
$$, 'P0001', 'The payer must be a member of the trip.', 'The payer must be a trip member');

select throws_ok($$
    select public.save_trip_expense(
        '00000000-0000-4000-b000-000000000031', null, 'Outsider shares', 100,
        '00000000-0000-4000-a000-000000000032',
        array['00000000-0000-4000-a000-000000000032', '00000000-0000-4000-a000-000000000034']::uuid[])
$$, 'P0001', 'Every participant must be a member of the trip.', 'Every participant must be a trip member');

select throws_ok($$
    insert into public.trip_expenses (trip_id, description, amount_cents, paid_by, created_by)
    values ('00000000-0000-4000-b000-000000000031', 'Direct', 100,
            '00000000-0000-4000-a000-000000000032', '00000000-0000-4000-a000-000000000032')
$$, '42501', null, 'Expenses cannot be written directly, only through the functions');

select lives_ok($$
    select public.save_trip_expense(
        '00000000-0000-4000-b000-000000000031',
        (select id from public.trip_expenses where description = 'Dinner'), 'Dinner for two', 1200,
        '00000000-0000-4000-a000-000000000032',
        array['00000000-0000-4000-a000-000000000032', '00000000-0000-4000-a000-000000000033']::uuid[])
$$, 'The payer can edit the expense');

select is(
    (select array_agg(share_cents) from public.trip_expense_participants),
    array[600, 600], 'Editing recalculates the shares of the new participants'
);

set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000033';

select throws_ok($$
    select public.delete_trip_expense((select id from public.trip_expenses limit 1))
$$, 'P0001', 'Only the payer or the organizer can delete this expense.', 'Another member cannot delete the expense');

select throws_ok($$
    select public.save_trip_expense(
        '00000000-0000-4000-b000-000000000031', (select id from public.trip_expenses limit 1),
        'Hijacked', 1, '00000000-0000-4000-a000-000000000033',
        array['00000000-0000-4000-a000-000000000033']::uuid[])
$$, 'P0001', 'Only the payer or the organizer can edit this expense.', 'Another member cannot edit the expense');

set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000034';

select is((select count(*) from public.trip_expenses), 0::bigint, 'A non-member cannot read expenses');

select throws_ok($$
    select public.save_trip_expense(
        '00000000-0000-4000-b000-000000000031', null, 'Intruder', 100,
        '00000000-0000-4000-a000-000000000032',
        array['00000000-0000-4000-a000-000000000032']::uuid[])
$$, 'P0001', 'Only trip members can manage expenses.', 'A non-member cannot log an expense');

set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000031';

select lives_ok($$
    select public.save_trip_expense(
        '00000000-0000-4000-b000-000000000031', (select id from public.trip_expenses limit 1),
        'Dinner (organizer fix)', 3000, '00000000-0000-4000-a000-000000000032',
        array['00000000-0000-4000-a000-000000000031', '00000000-0000-4000-a000-000000000032',
              '00000000-0000-4000-a000-000000000033']::uuid[])
$$, 'The organizer can edit an expense paid by someone else');

select lives_ok($$
    select public.delete_trip_expense((select id from public.trip_expenses limit 1))
$$, 'The organizer can delete an expense paid by someone else');

select is(
    (select count(*) from public.trip_expense_participants),
    0::bigint, 'Deleting an expense removes its shares'
);

select * from finish();
rollback;
