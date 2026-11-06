begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email) values
    ('00000000-0000-4000-a000-000000000001', 'date-window-organizer@example.test'),
    ('00000000-0000-4000-a000-000000000002', 'date-window-member@example.test'),
    ('00000000-0000-4000-a000-000000000003', 'date-window-outsider@example.test');

insert into public.trips (id, name, organizer_id) values
    ('00000000-0000-4000-b000-000000000001', 'Date window test', '00000000-0000-4000-a000-000000000001');
insert into public.trip_members (trip_id, user_id) values
    ('00000000-0000-4000-b000-000000000001', '00000000-0000-4000-a000-000000000002');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000001';

select lives_ok($$
    insert into public.trip_date_windows (id, trip_id, start_date, end_date, created_by, updated_at)
    values ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001',
            '2099-07-01', '2099-07-10', '00000000-0000-4000-a000-000000000001', '2000-01-01')
$$, 'Organizer can propose a window');

select throws_ok($$
    insert into public.trip_date_windows (trip_id, start_date, end_date, created_by)
    values ('00000000-0000-4000-b000-000000000001', '2099-07-10', '2099-07-01',
            '00000000-0000-4000-a000-000000000001')
$$, '23514', null, 'Database rejects an end date before the start date');

select lives_ok($$
    update public.trip_date_windows set end_date = '2099-07-12', updated_at = '1999-01-01'
    where id = '00000000-0000-4000-c000-000000000001'
$$, 'Organizer can edit a window');

select is(
    (select updated_at from public.trip_date_windows where id = '00000000-0000-4000-c000-000000000001'),
    now(), 'Trigger overrides a stale timestamp automatically'
);

set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000002';
select is((select count(*) from public.trip_date_windows), 1::bigint, 'Member can read windows');

select throws_ok($$
    insert into public.trip_date_windows (trip_id, start_date, end_date, created_by)
    values ('00000000-0000-4000-b000-000000000001', '2099-08-01', '2099-08-10',
            '00000000-0000-4000-a000-000000000002')
$$, '42501', null, 'Member cannot propose a window');

with changed as (
    update public.trip_date_windows set end_date = '2099-07-15' returning id
)
select is((select count(*) from changed), 0::bigint, 'Member cannot edit windows');

with deleted as (
    delete from public.trip_date_windows returning id
)
select is((select count(*) from deleted), 0::bigint, 'Member cannot delete windows');

set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000003';
select is((select count(*) from public.trip_date_windows), 0::bigint, 'Non-member cannot read windows');

set local role anon;
select throws_ok('select * from public.trip_date_windows', '42501', null, 'Anonymous users cannot read windows');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000001';
with deleted as (
    delete from public.trip_date_windows returning id
)
select is((select count(*) from deleted), 1::bigint, 'Organizer can delete a window');

select is((select count(*) from public.trip_date_windows), 0::bigint, 'Deleted window is no longer visible');

select * from finish();
rollback;
