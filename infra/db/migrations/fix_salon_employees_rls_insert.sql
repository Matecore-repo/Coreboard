-- Fix salon_employees RLS insert policy to validate employee belongs to same organization
-- This fixes the issue where assigning employees to salons fails with RLS policy violation

-- Drop existing policy
drop policy if exists "salon_employees_insert" on public.salon_employees;

-- Create updated policy that validates employee belongs to same org as salon
create policy "salon_employees_insert" on public.salon_employees
  for insert with check (
    exists (
      select 1 
      from app.salons s
      join app.memberships m on s.org_id = m.org_id
      join app.employees e on e.org_id = s.org_id
      where s.id = salon_employees.salon_id 
      and e.id = salon_employees.employee_id
      and m.user_id = auth.uid()
    )
  );

