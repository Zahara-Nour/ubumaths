-- ============================================================================
-- Invariant mono-professeur (refactor « professeur unique »)
-- Lot 2 — branche refactor/single-teacher — doc: docs/wip/single-teacher-refactor.md
-- ============================================================================
-- Autorise 0 OU 1 compte role='teacher' ; interdit >= 2.
-- Filet de sécurité ULTIME (défense en profondeur) : protège même contre un
-- UPDATE/INSERT SQL direct ou une route applicative oubliée. Le verrou UI +
-- serveur vit côté SvelteKit (admin/users, admin/classes).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_single_teacher()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
	-- Le WHEN du trigger garantit déjà NEW.role = 'teacher'.
	-- On refuse s'il existe DÉJÀ un autre compte teacher.
	IF EXISTS (
		SELECT 1 FROM public.profiles
		WHERE role = 'teacher' AND id <> NEW.id
	) THEN
		RAISE EXCEPTION
			'Invariant mono-professeur : un compte teacher existe déjà (un seul professeur autorisé).'
			USING ERRCODE = 'check_violation';
	END IF;
	RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_single_teacher() IS
	'Refactor mono-professeur : empêche l''existence de >= 2 comptes role=teacher (0 ou 1 autorisé).';

DROP TRIGGER IF EXISTS trg_enforce_single_teacher ON public.profiles;
CREATE TRIGGER trg_enforce_single_teacher
	BEFORE INSERT OR UPDATE OF role ON public.profiles
	FOR EACH ROW
	WHEN (NEW.role = 'teacher')
	EXECUTE FUNCTION public.enforce_single_teacher();

-- Note (race théorique) : le trigger lit sans verrou, donc deux écritures
-- 'teacher' STRICTEMENT concurrentes pourraient passer (négligeable : 1 seul
-- admin, actions manuelles). Pour une garantie atomique, on pourrait ajouter :
--   CREATE UNIQUE INDEX uq_profiles_single_teacher
--     ON public.profiles ((true)) WHERE role = 'teacher';
-- Non activé pour l'instant (le trigger donne un message lisible).
