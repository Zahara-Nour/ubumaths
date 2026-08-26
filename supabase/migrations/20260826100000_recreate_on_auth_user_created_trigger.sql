-- Recreate the on_auth_user_created trigger on auth.users
-- =======================================================
-- ROOT CAUSE (found 2026-08-26): the trigger `on_auth_user_created` on auth.users — which
-- runs public.handle_new_user() AFTER INSERT to create a profile for every new signup — was
-- MISSING from the prod (EU) database. The function existed, but nothing invoked it, so NO
-- profile was created for any new user (profile null → "Profil non trouvé" after email
-- confirmation).
--
-- It went unnoticed because no new account had been created in prod since the EU migration
-- (login was Google-only); it surfaced with the first real student self-registration. The
-- binding was most likely lost during the us-east-2 → eu-west-3 migration.
--
-- The local baseline (20260616220000) DOES create this trigger, which is why the integration
-- tests pass locally — but the baseline is never applied to prod, so prod diverged silently.
--
-- Idempotent (DROP IF EXISTS + CREATE): a no-op where the trigger already exists (local),
-- and it restores the binding where it is missing (prod).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
