begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

select col_is_pk('public', 'profiles', 'id', 'Profile user ID is the primary key');
select col_not_null('public', 'profiles', 'id', 'Profile user IDs cannot be null');
select has_column('public', 'profiles', 'updated_at', 'Profiles have the expected timestamp column');
select has_column('public', 'trips', 'updated_at', 'Trips have the timestamp used by invite regeneration');
select has_column('public', 'trip_members', 'id', 'Memberships have the ID selected by server actions');
select has_column('public', 'trip_dates', 'trip_id', 'Trip dates use the migration-defined foreign key column');
select has_trigger('auth', 'users', 'on_auth_user_created', 'The versioned signup trigger exists');
select hasnt_trigger('auth', 'users', 'register_update', 'The conflicting legacy signup trigger is absent');

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-4000-a072-000000000001', 'schema-contract@example.test', '{"username":"Schema contract"}');
select is(
    (select count(*) from public.profiles where id='00000000-0000-4000-a072-000000000001'),
    1::bigint, 'Signup creates exactly one profile'
);
select lives_ok($$
    insert into public.profiles (id, username)
    values ('00000000-0000-4000-a072-000000000001', 'Schema contract')
    on conflict (id) do nothing
$$, 'Profile backfill conflict handling works');

select * from finish();
rollback;
