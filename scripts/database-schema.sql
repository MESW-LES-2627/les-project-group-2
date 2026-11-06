-- Metadata only: compare hosted schemas with a clean migration-built database.
-- Exclude extension-owned objects, whose definitions depend on platform versions.
with app_tables as (
    select c.oid, c.relname, c.relrowsecurity, c.relforcerowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
      and not exists (
          select 1 from pg_depend d
          where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e'
      )
), app_functions as (
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and not exists (
          select 1 from pg_depend d
          where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'
      )
)
select jsonb_build_object(
    'tables', coalesce((
        select jsonb_agg(jsonb_build_object(
            'name', relname, 'rls', relrowsecurity, 'force_rls', relforcerowsecurity
        ) order by relname) from app_tables
    ), '[]'::jsonb),
    'columns', coalesce((
        select jsonb_agg(jsonb_build_object(
            'table', t.relname, 'name', a.attname,
            'type', format_type(a.atttypid, a.atttypmod),
            'not_null', a.attnotnull, 'identity', a.attidentity,
            'generated', a.attgenerated, 'default', pg_get_expr(d.adbin, d.adrelid)
        ) order by t.relname, a.attname)
        from app_tables t
        join pg_attribute a on a.attrelid = t.oid and a.attnum > 0 and not a.attisdropped
        left join pg_attrdef d on d.adrelid = t.oid and d.adnum = a.attnum
    ), '[]'::jsonb),
    'constraints', coalesce((
        select jsonb_agg(jsonb_build_object(
            'table', t.relname, 'name', c.conname, 'definition', pg_get_constraintdef(c.oid)
        ) order by t.relname, c.conname)
        from app_tables t join pg_constraint c on c.conrelid = t.oid
    ), '[]'::jsonb),
    'indexes', coalesce((
        select jsonb_agg(jsonb_build_object(
            'table', tablename, 'name', indexname, 'definition', indexdef
        ) order by tablename, indexname)
        from pg_indexes where schemaname = 'public'
          and tablename in (select relname from app_tables)
    ), '[]'::jsonb),
    'policies', coalesce((
        select jsonb_agg(jsonb_build_object(
            'schema', schemaname, 'table', tablename, 'name', policyname,
            'permissive', permissive, 'roles', roles, 'command', cmd,
            'using', qual, 'check', with_check
        ) order by schemaname, tablename, policyname)
        from pg_policies
        where schemaname = 'public' or (schemaname = 'storage' and tablename = 'objects')
    ), '[]'::jsonb),
    'functions', coalesce((
        select jsonb_agg(jsonb_build_object(
            'name', proname, 'arguments', pg_get_function_identity_arguments(oid),
            'definition', pg_get_functiondef(oid)
        ) order by proname, pg_get_function_identity_arguments(oid)) from app_functions
    ), '[]'::jsonb),
    'triggers', coalesce((
        select jsonb_agg(jsonb_build_object(
            'table', t.tgrelid::regclass::text, 'name', t.tgname,
            'definition', pg_get_triggerdef(t.oid)
        ) order by t.tgrelid::regclass::text, t.tgname)
        from pg_trigger t where not t.tgisinternal
          and (t.tgrelid in (select oid from app_tables) or t.tgfoid in (select oid from app_functions))
    ), '[]'::jsonb)
) as schema;
