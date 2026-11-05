-- Create profiles table
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text,
    avatar_url text,
    updated_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policies for public.profiles
create policy "Public profiles are viewable by everyone"
    on public.profiles
    for select
    using (true);

create policy "Users can insert their own profile"
    on public.profiles
    for insert
    to authenticated
    with check (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles
    for update
    to authenticated
    using (auth.uid() = id);

create policy "Users can delete their own profile"
    on public.profiles
    for delete
    to authenticated
    using (auth.uid() = id);

-- Permissions
grant all on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- Automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, username, avatar_url)
    values (new.id, new.raw_user_meta_data->>'username', null)
    on conflict (id) do nothing;
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Backfill profiles for existing users
insert into public.profiles (id, username)
select id, raw_user_meta_data->>'username' from auth.users
on conflict (id) do nothing;

-- Create public storage bucket for profile pictures
insert into storage.buckets (id, name, public)
values ('profile_pics', 'profile_pics', true)
on conflict (id) do nothing;

-- Storage RLS policies for profile_pics bucket
create policy "Profile pictures are publicly accessible"
    on storage.objects
    for select
    using (bucket_id = 'profile_pics');

create policy "Authenticated users can upload profile pictures"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'profile_pics');

create policy "Users can update their own profile picture"
    on storage.objects
    for update
    to authenticated
    using (bucket_id = 'profile_pics');

create policy "Users can delete their own profile picture"
    on storage.objects
    for delete
    to authenticated
    using (bucket_id = 'profile_pics');
