-- ============================================================================
-- SECURITY — Vague 2 (voir docs/wip/security-audit-2026-08.md)
-- Finding M16 : entropie des codes de classe.
-- ============================================================================
-- generate_join_code() faisait `upper(substring(md5(random()::text) for 6))` :
-- 6 caractères hex = 24 bits, issus de `random()` (drand48, seedable, NON crypto).
-- On passe à un CSPRNG (gen_random_bytes / pgcrypto) et 8 caractères hex (32 bits).
-- Corps par ailleurs identique (boucle d'unicité).
-- (Les codes personnalisés saisis par l'admin sont validés côté app — page classes.)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions', 'pg_temp'
AS $$
DECLARE
	code TEXT;
	code_exists BOOLEAN;
BEGIN
	LOOP
		code := upper(substring(encode(gen_random_bytes(8), 'hex') FROM 1 FOR 8));
		SELECT EXISTS(SELECT 1 FROM classes WHERE join_code = code) INTO code_exists;
		EXIT WHEN NOT code_exists;
	END LOOP;
	RETURN code;
END;
$$;
