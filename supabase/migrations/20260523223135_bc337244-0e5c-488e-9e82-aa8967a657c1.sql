CREATE OR REPLACE FUNCTION public.set_estates_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS estates_set_updated_at ON public.estates;
CREATE TRIGGER estates_set_updated_at
BEFORE UPDATE ON public.estates
FOR EACH ROW
EXECUTE FUNCTION public.set_estates_updated_at();