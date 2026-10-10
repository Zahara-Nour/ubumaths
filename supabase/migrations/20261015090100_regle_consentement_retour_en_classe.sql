-- ============================================================================
-- A3 — règle de consentement : la base fait foi ; comptes anciens soumis au retour
-- ============================================================================
--
-- Décisions de David (2026-10-10) :
--   1. la règle de la base (apply_consent_rule_by_grade : tout niveau sauf 1re et
--      terminale, primaire et niveau inconnu compris) fait foi ; le CODE s'y aligne
--      (GRADES_EXEMPT_FROM_CONSENT, page des consentements du prof) — pas de SQL pour ça ;
--   2. les comptes créés AVANT la règle (20261001190000) et jamais soumis sont soumis à
--      leur RETOUR en classe, pas tout de suite. Mesuré en prod : 33 (30 élèves de 6e,
--      3 sans niveau), tous archivés ; aucun élève actif n'est d'un niveau soumis.
--
-- Une dispense du prof s'écrit aussi consent_required = false : sans marque, un compte
-- ancien et un élève dispensé sont indiscernables (mesuré : AUCUNE dispense jamais
-- donnée en prod — 0 changement de consent_required dans audit_logs). D'où la marque
-- explicite consent_rule_pending :
--   * posée ici, une fois, sur les comptes anciens non soumis ;
--   * appliquée quand l'élève rejoint une classe ou y redevient actif : consentement
--     requis, 30 jours de grâce (comme un nouveau compte), marque retirée ;
--   * retirée dès que le prof change le consentement (il a décidé), ou que l'élève passe
--     en 1re ou terminale (il n'est plus d'un niveau soumis). PAS sur un simple changement
--     de niveau entre niveaux soumis (6e → 5e) : apply_consent_rule_by_grade n'y touche à
--     rien, la marque doit survivre (security-auditor, 2026-10-10 : l'import met le niveau
--     à jour AVANT l'entrée en classe — les 30 élèves de 6e y auraient échappé) ;
--   * verrouillée comme les autres champs de consentement (un élève ne la retire pas).
--
-- Question d'accès en miroir — qui perdra ce qu'il avait ? Un de ces 33 élèves, s'il
-- revient en classe : lecture seule au bout de 30 jours sans accord parental.
--
-- Additive : une colonne (défaut false), deux triggers, la garde redéfinie (un champ
-- de plus), et la marque posée sur 33 lignes (aucune autre valeur touchée).
--
-- ROLLBACK :
--   DROP TRIGGER apply_pending_consent_rule_trg ON public.class_members;
--   DROP TRIGGER consent_rule_pending_clear_trg ON public.profiles;
--   DROP FUNCTION public.apply_pending_consent_rule(), public.clear_consent_rule_pending();
--   recréer guard_profile_consent_fields sans la ligne consent_rule_pending ;
--   ALTER TABLE public.profiles DROP COLUMN consent_rule_pending;  (perd la marque seule)
-- ============================================================================

ALTER TABLE public.profiles
	ADD COLUMN consent_rule_pending boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.consent_rule_pending IS
	'Compte créé avant la règle de consentement par niveau, jamais soumis : la règle s''applique '
	'à son retour en classe (A3, 2026-10-10). Retirée par le prof ou un changement de niveau.';

-- Garde des champs de consentement : la marque est verrouillée comme les autres.
CREATE OR REPLACE FUNCTION public.guard_profile_consent_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
	if (
		new.consent_required is distinct from old.consent_required
		or new.consent_granted_at is distinct from old.consent_granted_at
		or new.consent_grace_period_ends is distinct from old.consent_grace_period_ends
		or new.age_declaration is distinct from old.age_declaration
		or new.age_declared_at is distinct from old.age_declared_at
		or new.consent_rule_pending is distinct from old.consent_rule_pending
	)
	and current_user in ('authenticated', 'anon')
	and not public.is_teacher_or_admin() then
		raise exception 'Les champs de consentement ne sont modifiables que par le professeur ou l''administrateur.'
			using errcode = '42501';
	end if;
	return new;
end;
$function$;

-- La marque tombe quand le consentement change (prof, ou règle par niveau qui vient de
-- s'appliquer) ou quand l'élève passe en 1re / terminale. Le trigger est nommé pour
-- s'exécuter APRÈS consent_rule_by_grade_trg (ordre alphabétique des triggers BEFORE) :
-- il voit le consentement déjà recalculé par la règle par niveau.
CREATE OR REPLACE FUNCTION public.clear_consent_rule_pending()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
	IF NEW.consent_rule_pending
		AND (NEW.consent_required IS DISTINCT FROM OLD.consent_required
			OR NEW.grade = ANY (ARRAY['1_GEN', '1_SPE', '1_TECHNO', 'T_GEN', 'T_SPE',
				'T_EXP', 'T_COMP', 'T_TECHNO'])) THEN
		NEW.consent_rule_pending := false;
	END IF;
	RETURN NEW;
END;
$$;

CREATE TRIGGER consent_rule_pending_clear_trg
	BEFORE UPDATE ON public.profiles
	FOR EACH ROW EXECUTE FUNCTION public.clear_consent_rule_pending();

-- Retour en classe (arrivée, ou archivé → actif) : la règle s'applique au compte marqué.
-- SECURITY DEFINER : l'élève qui rejoint une classe par son code n'a pas le droit
-- d'écrire ses champs de consentement (garde ci-dessus) ; le trigger, lui, l'a.
CREATE OR REPLACE FUNCTION public.apply_pending_consent_rule()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
	IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active') THEN
		UPDATE public.profiles
		SET consent_required = true,
			consent_grace_period_ends = now() + interval '30 days',
			consent_rule_pending = false
		WHERE id = NEW.student_id
		  AND consent_rule_pending
		  AND consent_granted_at IS NULL
		  -- Par prudence : jamais un élève de 1re / terminale.
		  AND (grade IS NULL OR NOT grade = ANY (ARRAY['1_GEN', '1_SPE', '1_TECHNO',
			'T_GEN', 'T_SPE', 'T_EXP', 'T_COMP', 'T_TECHNO']));
	END IF;
	RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_pending_consent_rule() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clear_consent_rule_pending() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER apply_pending_consent_rule_trg
	AFTER INSERT OR UPDATE OF status ON public.class_members
	FOR EACH ROW EXECUTE FUNCTION public.apply_pending_consent_rule();

-- La marque, posée une fois : comptes élèves créés avant la règle, d'un niveau soumis,
-- non soumis, sans consentement ni réponse d'âge (33 en prod le 2026-10-10).
UPDATE public.profiles
SET consent_rule_pending = true
WHERE role = 'student'
  AND NOT consent_required
  AND consent_granted_at IS NULL
  AND age_declaration IS NULL
  AND (grade IS NULL OR NOT grade = ANY (ARRAY['1_GEN', '1_SPE', '1_TECHNO', 'T_GEN',
	'T_SPE', 'T_EXP', 'T_COMP', 'T_TECHNO']))
  AND created_at < '2026-10-01 19:00:00+00';
