begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users (id, email) values
    ('00000000-0000-4000-a000-000000000021', 'comment-organizer@example.test'),
    ('00000000-0000-4000-a000-000000000022', 'comment-member@example.test'),
    ('00000000-0000-4000-a000-000000000023', 'comment-outsider@example.test');

insert into public.trips (id, name, organizer_id) values
    ('00000000-0000-4000-b000-000000000021', 'Comment test', '00000000-0000-4000-a000-000000000021');
insert into public.trip_members (trip_id, user_id) values
    ('00000000-0000-4000-b000-000000000021', '00000000-0000-4000-a000-000000000022');

insert into public.pins (id, trip_id, name, lat, lng, proposed_by) values
    ('00000000-0000-4000-d000-000000000021', '00000000-0000-4000-b000-000000000021',
     'Belem Tower', 38.69, -9.21, 'comment-organizer@example.test');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000022';

select lives_ok($$
    insert into public.pin_comments (id, pin_id, user_id, author_name, body)
    values ('00000000-0000-4000-e000-000000000001', '00000000-0000-4000-d000-000000000021',
            '00000000-0000-4000-a000-000000000022', 'Member', 'Looks great, let us go!')
$$, 'A trip member can comment on a pin');

select throws_ok($$
    insert into public.pin_comments (pin_id, user_id, author_name, body)
    values ('00000000-0000-4000-d000-000000000021',
            '00000000-0000-4000-a000-000000000021', 'Organizer', 'Written as someone else')
$$, '42501', null, 'A member cannot comment as another user');

select throws_ok($$
    insert into public.pin_comments (pin_id, user_id, author_name, body)
    values ('00000000-0000-4000-d000-000000000021',
            '00000000-0000-4000-a000-000000000022', 'Member', '    ')
$$, '23514', null, 'An empty comment is rejected');

select throws_ok($$
    insert into public.pin_comments (pin_id, user_id, author_name, body)
    values ('00000000-0000-4000-d000-000000000021',
            '00000000-0000-4000-a000-000000000022', 'Member', repeat('a', 1001))
$$, '23514', null, 'A comment longer than 1000 characters is rejected');

set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000021';
select is((select count(*) from public.pin_comments), 1::bigint, 'The organizer sees the comment');

with deleted as (
    delete from public.pin_comments
    where id = '00000000-0000-4000-e000-000000000001'
    returning id
)
select is((select count(*) from deleted), 0::bigint, 'Another member cannot delete someone else''s comment');

set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000023';
select is((select count(*) from public.pin_comments), 0::bigint, 'A non-member cannot read comments');

select throws_ok($$
    insert into public.pin_comments (pin_id, user_id, author_name, body)
    values ('00000000-0000-4000-d000-000000000021',
            '00000000-0000-4000-a000-000000000023', 'Outsider', 'Let me in')
$$, '42501', null, 'A non-member cannot comment');

set local role anon;
select throws_ok('select * from public.pin_comments', '42501', null, 'Anonymous users cannot read comments');

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000022';
with deleted as (
    delete from public.pin_comments
    where id = '00000000-0000-4000-e000-000000000001'
    returning id
)
select is((select count(*) from deleted), 1::bigint, 'The author can delete their own comment');

set local request.jwt.claim.sub = '00000000-0000-4000-a000-000000000021';
select is((select count(*) from public.pin_comments), 0::bigint, 'The deleted comment is gone for every member');

select * from finish();
rollback;
