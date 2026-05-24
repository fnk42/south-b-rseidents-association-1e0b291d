
-- Estates: fully open for phase 1
DROP POLICY IF EXISTS "Admins delete estates" ON public.estates;
DROP POLICY IF EXISTS "Admins insert estates" ON public.estates;
DROP POLICY IF EXISTS "Anyone read estates" ON public.estates;
DROP POLICY IF EXISTS "Managers update estates" ON public.estates;

CREATE POLICY "Phase1 estates all access"
  ON public.estates FOR ALL
  USING (true) WITH CHECK (true);

-- Committee members: fully open for phase 1
DROP POLICY IF EXISTS "Anyone read committee" ON public.committee_members;
DROP POLICY IF EXISTS "Managers delete committee" ON public.committee_members;
DROP POLICY IF EXISTS "Managers insert committee" ON public.committee_members;
DROP POLICY IF EXISTS "Managers update committee" ON public.committee_members;

CREATE POLICY "Phase1 committee all access"
  ON public.committee_members FOR ALL
  USING (true) WITH CHECK (true);

-- Residents: locked down for phase 1
DROP POLICY IF EXISTS "Managers delete residents" ON public.residents;
DROP POLICY IF EXISTS "Managers insert residents" ON public.residents;
DROP POLICY IF EXISTS "Managers read residents" ON public.residents;
DROP POLICY IF EXISTS "Managers update residents" ON public.residents;
-- No policies = no access while RLS is enabled. Table + data preserved for phase 2.
