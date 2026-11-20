-- Add is_confirmed column to pins table
alter table public.pins add column if not exists is_confirmed boolean not null default false;
