begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

insert into auth.users (id, email) values
    ('00000000-0000-4000-a073-000000000001', 'delete-self@example.test'),
    ('00000000-0000-4000-a073-000000000002', 'keep-other@example.test');

set local role anon;
select throws_ok('select public.delete_own_account()', '42501', null, 'Anonymous callers cannot delete accounts');

set local role authenticated;
set local request.jwt.claim.sub = '';
select throws_ok('select public.delete_own_account()', '42501', 'Authentication required', 'A missing user ID is rejected');

set local request.jwt.claim.sub = '00000000-0000-4000-a073-000000000001';
select lives_ok('select public.delete_own_account()', 'A member can delete their own account');

reset role;
select is((select count(*) from auth.users where id='00000000-0000-4000-a073-000000000001'), 0::bigint, 'Only the caller account is deleted');
select is((select count(*) from public.profiles where id='00000000-0000-4000-a073-000000000001'), 0::bigint, 'The caller profile is removed by the foreign key');
select is((select count(*) from auth.users where id='00000000-0000-4000-a073-000000000002'), 1::bigint, 'Another account is preserved');

select * from finish();
rollback;
