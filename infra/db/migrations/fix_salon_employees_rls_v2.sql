-- Fix salon_employees RLS insert policy - Simplified version
-- This ensures the policy works correctly by verifying:
-- 1. User has membership in the salon's organization
-- 2. Employee belongs to the same organization as the salon

-- Drop existing policy
drop policy if exists "salon_employees_insert" on public.salon_employees;

-- Create simplified policy that verifies both salon and employee belong to the user's organization
create policy "salon_employees_insert" on public.salon_employees
  for insert with check (
    -- User must have membership and salon must belong to user's organization
    exists (
      select 1 
      from app.salons s
      join app.memberships m on s.org_id = m.org_id
      where s.id = salon_employees.salon_id 
      and m.user_id = auth.uid()
    )
    -- Employee must belong to the same organization as the salon
    and exists (
      select 1 
      from app.employees e
      join app.salons s on s.org_id = e.org_id
      where e.id = salon_employees.employee_id
      and s.id = salon_employees.salon_id
      and exists (
        select 1 
        from app.memberships m 
        where m.org_id = e.org_id 
        and m.user_id = auth.uid()
      )
    )
  );

