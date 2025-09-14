-- Fix RLS recursion by avoiding self-referential subqueries on the same table

-- organization_members: allow a user to see rows where they are the user
drop policy if exists org_members_select on organization_members;
create policy org_members_select on organization_members for select using (
  user_id = auth.uid()
);

-- projects: select if user is a member of the owning organization via EXISTS
drop policy if exists projects_select on projects;
create policy projects_select on projects for select using (
  exists (
    select 1 from organization_members m
    where m.organization_id = projects.organization_id and m.user_id = auth.uid()
  )
);

-- project_members: allow viewing membership rows for projects the user is part of
drop policy if exists project_members_select on project_members;
create policy project_members_select on project_members for select using (
  exists (
    select 1 from project_members pm2
    where pm2.project_id = project_members.project_id and pm2.user_id = auth.uid()
  )
);


