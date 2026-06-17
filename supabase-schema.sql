-- CoupleSync Database Schema

-- Couples tabel
create table couples (
  id uuid primary key default gen_random_uuid(),
  user_id_1 uuid references auth.users(id) on delete cascade,
  user_id_2 uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id_1, user_id_2)
);

-- Invite codes voor partners te koppelen
create table couple_invites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_by uuid references auth.users(id) on delete cascade,
  couple_id uuid references couples(id) on delete cascade,
  used_by uuid references auth.users(id),
  used_at timestamptz,
  expires_at timestamptz default (now() + interval '7 days'),
  created_at timestamptz default now()
);

-- User profielen
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  couple_id uuid references couples(id),
  stripe_customer_id text,
  subscription_status text default 'trial', -- trial | active | cancelled
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz default now()
);

-- Syncs
create table syncs (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade not null,
  type text not null check (type in ('week', 'maand')),
  status text not null default 'open' check (status in ('open', 'user1_done', 'completed')),
  user1_done_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Antwoorden op sync vragen
create table sync_responses (
  id uuid primary key default gen_random_uuid(),
  sync_id uuid references syncs(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  section text not null, -- check_in | prioriteiten | jaarplanning | financien
  question_key text not null,
  answer_text text,
  answer_slider integer check (answer_slider between 1 and 10),
  created_at timestamptz default now(),
  unique(sync_id, user_id, question_key)
);

-- Acties / afspraken
create table actions (
  id uuid primary key default gen_random_uuid(),
  sync_id uuid references syncs(id) on delete cascade not null,
  couple_id uuid references couples(id) on delete cascade not null,
  title text not null,
  assigned_to uuid references auth.users(id),
  deadline date,
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Row Level Security
alter table couples enable row level security;
alter table couple_invites enable row level security;
alter table profiles enable row level security;
alter table syncs enable row level security;
alter table sync_responses enable row level security;
alter table actions enable row level security;

-- Policies: gebruikers zien alleen hun eigen couple data
create policy "couples: eigen data" on couples
  for all using (auth.uid() = user_id_1 or auth.uid() = user_id_2);

create policy "profiles: eigen profiel" on profiles
  for all using (auth.uid() = id);

create policy "invites: eigen invites" on couple_invites
  for all using (auth.uid() = created_by or auth.uid() = used_by);

create policy "syncs: eigen couple" on syncs
  for all using (
    couple_id in (
      select id from couples
      where user_id_1 = auth.uid() or user_id_2 = auth.uid()
    )
  );

create policy "responses: eigen couple" on sync_responses
  for all using (
    sync_id in (
      select s.id from syncs s
      join couples c on c.id = s.couple_id
      where c.user_id_1 = auth.uid() or c.user_id_2 = auth.uid()
    )
  );

create policy "actions: eigen couple" on actions
  for all using (
    couple_id in (
      select id from couples
      where user_id_1 = auth.uid() or user_id_2 = auth.uid()
    )
  );

-- Trigger: profiel aanmaken bij registratie
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
