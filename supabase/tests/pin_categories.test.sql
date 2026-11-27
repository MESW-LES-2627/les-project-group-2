begin;

create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
    ('00000000-0000-4000-a000-000000000011', 'pin-category-organizer@example.test');

insert into public.trips (id, name, organizer_id) values
    ('00000000-0000-4000-b000-000000000011', 'Pin category test', '00000000-0000-4000-a000-000000000011');

select lives_ok($$
    insert into public.pins (id, trip_id, name, lat, lng, proposed_by)
    values ('00000000-0000-4000-d000-000000000001', '00000000-0000-4000-b000-000000000011',
            'No category given', 38.7, -9.1, 'pin-category-organizer@example.test')
$$, 'A pin can be inserted without naming a category');

select is(
    (select category from public.pins where id = '00000000-0000-4000-d000-000000000001'),
    'visit', 'Pins default to the visit category'
);

select lives_ok($$
    insert into public.pins (trip_id, name, category, lat, lng, proposed_by)
    values ('00000000-0000-4000-b000-000000000011', 'Hotel', 'stay', 38.7, -9.1, 'pin-category-organizer@example.test'),
           ('00000000-0000-4000-b000-000000000011', 'Museum', 'visit', 38.7, -9.1, 'pin-category-organizer@example.test'),
           ('00000000-0000-4000-b000-000000000011', 'Surf lesson', 'activity', 38.7, -9.1, 'pin-category-organizer@example.test'),
           ('00000000-0000-4000-b000-000000000011', 'Restaurant', 'food', 38.7, -9.1, 'pin-category-organizer@example.test'),
           ('00000000-0000-4000-b000-000000000011', 'Square', 'meeting_point', 38.7, -9.1, 'pin-category-organizer@example.test')
$$, 'Stay, visit, activity, food and meeting point are accepted');

select throws_ok($$
    insert into public.pins (trip_id, name, category, lat, lng, proposed_by)
    values ('00000000-0000-4000-b000-000000000011', 'Old category', 'sightseeing', 38.7, -9.1,
            'pin-category-organizer@example.test')
$$, '23514', null, 'The legacy sightseeing category is rejected');

select throws_ok($$
    insert into public.pins (trip_id, name, category, lat, lng, proposed_by)
    values ('00000000-0000-4000-b000-000000000011', 'Unknown category', 'spa', 38.7, -9.1,
            'pin-category-organizer@example.test')
$$, '23514', null, 'An unknown category is rejected');

select throws_ok($$
    insert into public.pins (trip_id, name, category, lat, lng, proposed_by)
    values ('00000000-0000-4000-b000-000000000011', 'Null category', null, 38.7, -9.1,
            'pin-category-organizer@example.test')
$$, '23502', null, 'A pin must have a category');

select lives_ok($$
    update public.pins set category = 'meeting_point'
    where id = '00000000-0000-4000-d000-000000000001'
$$, 'The category of a pin can be changed');

select is(
    (select category from public.pins where id = '00000000-0000-4000-d000-000000000001'),
    'meeting_point', 'The changed category is stored'
);

select * from finish();
rollback;
