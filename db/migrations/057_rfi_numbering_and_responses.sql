-- RFI numbering and responses

-- 1) Per-project RFI index: add column and auto-increment via function + trigger
alter table rfi add column if not exists rfi_index integer;

create or replace function next_rfi_index(p_project uuid)
returns integer language plpgsql as $$
declare
  v_next integer;
begin
  -- Ensure only one concurrent calculator per project
  perform pg_advisory_xact_lock(('x'||substr(replace(p_project::text,'-',''),1,16))::bit(64)::bigint);
  select coalesce(max(rfi_index), 0) + 1 into v_next from rfi where project_id = p_project;
  return v_next;
end;$$;

create or replace function trg_rfi_set_index()
returns trigger language plpgsql as $$
begin
  if new.rfi_index is null then
    new.rfi_index := next_rfi_index(new.project_id);
  end if;
  return new;
end;$$;

drop trigger if exists trg_rfi_set_index on rfi;
create trigger trg_rfi_set_index before insert on rfi
for each row execute function trg_rfi_set_index();

-- Unique per project
create unique index if not exists ux_rfi_project_index on rfi(project_id, rfi_index);

-- 2) Backfill existing rows (idempotent: only rows with null index)
do $$
declare
  rec record;
begin
  for rec in select id, project_id from rfi where rfi_index is null order by created_at loop
    update rfi set rfi_index = next_rfi_index(rec.project_id) where id = rec.id;
  end loop;
end$$;

-- 3) RFI responses table for multi-message thread
create table if not exists rfi_responses (
  id uuid primary key default gen_random_uuid(),
  rfi_id uuid not null references rfi(id) on delete cascade,
  body text not null,
  attachments jsonb default '[]'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz default now()
);

alter table rfi_responses enable row level security;

-- Policies: project members can read/insert; creator or project editors can modify
drop policy if exists rfi_responses_select on rfi_responses;
create policy rfi_responses_select on rfi_responses for select using (
  exists(
    select 1 from rfi join project_members pm on pm.project_id = rfi.project_id
    where rfi.id = rfi_responses.rfi_id and pm.user_id = auth.uid()
  )
);

drop policy if exists rfi_responses_insert on rfi_responses;
create policy rfi_responses_insert on rfi_responses for insert with check (
  exists(
    select 1 from rfi join project_members pm on pm.project_id = rfi.project_id
    where rfi.id = rfi_responses.rfi_id and pm.user_id = auth.uid()
  )
);

drop policy if exists rfi_responses_modify on rfi_responses;
create policy rfi_responses_modify on rfi_responses for all using (
  -- Allow update/delete by creator or project editors
  created_by = auth.uid()
  or exists(
    select 1 from rfi join project_members pm on pm.project_id = rfi.project_id
    where rfi.id = rfi_responses.rfi_id and pm.user_id = auth.uid() and pm.role in ('owner','editor')
  )
);

-- Helpful indexes
create index if not exists idx_rfi_responses_rfi_created_at on rfi_responses(rfi_id, created_at desc);
