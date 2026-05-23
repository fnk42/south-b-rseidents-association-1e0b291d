
CREATE TABLE public.estates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_name text NOT NULL,
  number_of_houses integer,
  registration_status text NOT NULL DEFAULT 'Not Registered' CHECK (registration_status IN ('Registered','In Progress','Not Registered')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('Chairperson','Vice Chairperson','Secretary','Treasurer','Member')),
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.residents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  house_number text NOT NULL,
  full_name text NOT NULL,
  phone text,
  email text,
  occupancy text NOT NULL CHECK (occupancy IN ('Owner','Tenant')),
  owner_name text,
  owner_phone text,
  owner_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_committee_members_estate_id ON public.committee_members(estate_id);
CREATE INDEX idx_residents_estate_id ON public.residents(estate_id);

ALTER TABLE public.estates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read estates" ON public.estates FOR SELECT USING (true);
CREATE POLICY "Public insert estates" ON public.estates FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update estates" ON public.estates FOR UPDATE USING (true);
CREATE POLICY "Public delete estates" ON public.estates FOR DELETE USING (true);

CREATE POLICY "Public read committee" ON public.committee_members FOR SELECT USING (true);
CREATE POLICY "Public insert committee" ON public.committee_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update committee" ON public.committee_members FOR UPDATE USING (true);
CREATE POLICY "Public delete committee" ON public.committee_members FOR DELETE USING (true);

CREATE POLICY "Public read residents" ON public.residents FOR SELECT USING (true);
CREATE POLICY "Public insert residents" ON public.residents FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update residents" ON public.residents FOR UPDATE USING (true);
CREATE POLICY "Public delete residents" ON public.residents FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER estates_set_updated_at BEFORE UPDATE ON public.estates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
