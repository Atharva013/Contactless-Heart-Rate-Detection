create table if not exists public.patient_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('wellness', 'emergency')),
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.patient_records enable row level security;

drop policy if exists "Users can read their own patient records" on public.patient_records;
create policy "Users can read their own patient records"
on public.patient_records
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own patient records" on public.patient_records;
create policy "Users can insert their own patient records"
on public.patient_records
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own patient records" on public.patient_records;
create policy "Users can delete their own patient records"
on public.patient_records
for delete
using (auth.uid() = user_id);

create index if not exists patient_records_user_created_idx
on public.patient_records(user_id, created_at desc);
