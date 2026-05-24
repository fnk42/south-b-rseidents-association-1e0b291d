
-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'committee_member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, estate_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============ SECURITY DEFINER FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin' AND approved = true
  )
$$;

CREATE OR REPLACE FUNCTION public.user_manages_estate(_user_id UUID, _estate_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND approved = true
      AND (role = 'admin' OR (role = 'committee_member' AND estate_id = _estate_id))
  )
$$;

-- ============ PROFILE AUTO-CREATE + BOOTSTRAP ADMIN ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1))
  );

  -- First user becomes approved admin
  SELECT COUNT(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role, approved) VALUES (NEW.id, 'admin', true);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ PROFILES RLS ============
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ============ USER_ROLES RLS ============
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE USING (public.is_admin(auth.uid()));

-- ============ REWRITE ESTATES POLICIES ============
DROP POLICY IF EXISTS "Public delete estates" ON public.estates;
DROP POLICY IF EXISTS "Public insert estates" ON public.estates;
DROP POLICY IF EXISTS "Public read estates" ON public.estates;
DROP POLICY IF EXISTS "Public update estates" ON public.estates;

CREATE POLICY "Anyone read estates" ON public.estates FOR SELECT USING (true);
CREATE POLICY "Admins insert estates" ON public.estates FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Managers update estates" ON public.estates FOR UPDATE USING (public.user_manages_estate(auth.uid(), id));
CREATE POLICY "Admins delete estates" ON public.estates FOR DELETE USING (public.is_admin(auth.uid()));

-- ============ REWRITE COMMITTEE_MEMBERS POLICIES ============
DROP POLICY IF EXISTS "Public delete committee" ON public.committee_members;
DROP POLICY IF EXISTS "Public insert committee" ON public.committee_members;
DROP POLICY IF EXISTS "Public read committee" ON public.committee_members;
DROP POLICY IF EXISTS "Public update committee" ON public.committee_members;

CREATE POLICY "Anyone read committee" ON public.committee_members FOR SELECT USING (true);
CREATE POLICY "Managers insert committee" ON public.committee_members FOR INSERT WITH CHECK (public.user_manages_estate(auth.uid(), estate_id));
CREATE POLICY "Managers update committee" ON public.committee_members FOR UPDATE USING (public.user_manages_estate(auth.uid(), estate_id));
CREATE POLICY "Managers delete committee" ON public.committee_members FOR DELETE USING (public.user_manages_estate(auth.uid(), estate_id));

-- ============ REWRITE RESIDENTS POLICIES (PRIVATE) ============
DROP POLICY IF EXISTS "Public delete residents" ON public.residents;
DROP POLICY IF EXISTS "Public insert residents" ON public.residents;
DROP POLICY IF EXISTS "Public read residents" ON public.residents;
DROP POLICY IF EXISTS "Public update residents" ON public.residents;

CREATE POLICY "Managers read residents" ON public.residents FOR SELECT USING (public.user_manages_estate(auth.uid(), estate_id));
CREATE POLICY "Managers insert residents" ON public.residents FOR INSERT WITH CHECK (public.user_manages_estate(auth.uid(), estate_id));
CREATE POLICY "Managers update residents" ON public.residents FOR UPDATE USING (public.user_manages_estate(auth.uid(), estate_id));
CREATE POLICY "Managers delete residents" ON public.residents FOR DELETE USING (public.user_manages_estate(auth.uid(), estate_id));

-- ============ Allow public to still count residents for the directory ============
-- The home page shows resident counts. We expose a count-only function.
CREATE OR REPLACE FUNCTION public.estate_resident_counts()
RETURNS TABLE(estate_id UUID, resident_count BIGINT)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT estate_id, COUNT(*)::BIGINT FROM public.residents GROUP BY estate_id
$$;
GRANT EXECUTE ON FUNCTION public.estate_resident_counts() TO anon, authenticated;
