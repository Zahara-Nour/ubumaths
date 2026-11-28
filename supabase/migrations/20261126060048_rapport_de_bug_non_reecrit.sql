-- ============================================================================
-- Rapports de bug : l'auteur n'écrit que ce que l'écran lui propose (écart T29)
-- ============================================================================
-- Constat du security-auditor sur #3115 : la policy UPDATE de `bug_reports`
-- (« Users can update own pending bug reports ») n'a pas de liste de colonnes, et
-- la policy INSERT (« Users can create bug reports ») ne contrôle que l'auteur.
-- Par l'API de la base, l'auteur d'un rapport pouvait :
--   - le créer déjà « résolu », avec une note de résolution signée de l'admin et
--     une date de l'an dernier ;
--   - tant qu'il était en attente, en réécrire toutes les colonnes : gravité,
--     page d'origine, contexte technique, date, et le chemin de la capture, qu'il
--     pouvait faire pointer vers le fichier d'un autre (l'admin, qui lit toutes
--     les captures, aurait vu celle d'un camarade sous son rapport) ;
--   - écrire dans `screenshot_url` une adresse de son choix, que l'export
--     Markdown de l'admin recopie telle quelle.
-- Existe depuis le schéma d'origine. Mesuré en prod le 2026-11-26 (lecture
-- seule) : 245 rapports, tous en attente, aucun avec capture, adresse ou
-- résolution : aucune ligne existante n'est concernée.
--
-- Accès (question en miroir, tranchée par David le 2026-11-26) : personne ne
-- gagne d'accès. L'auteur perd ce qu'aucun écran ne lui proposait.
--   - À la création, un rapport naît « en attente », daté de maintenant, sans
--     capture, sans note, signature ni date de résolution. Toute autre valeur est
--     REFUSÉE (erreur, pas valeur écrasée : l'application n'envoie aucune de ces
--     colonnes, src/routes/api/bug-reports/+server.ts).
--   - Tant qu'il est en attente, l'auteur ne change que le titre, la description
--     (api/bug-reports/[reportId], PATCH) et la capture
--     (api/bug-reports/[reportId]/screenshot), dont le chemin doit être rangé
--     comme l'application le range : `<auteur>/<rapport>/<fichier>`.
--     `screenshot_url` ne peut qu'être vidée (ce que fait la route de capture).
--     Une capture jointe se remplace mais ne se retire pas (chemin remis à vide :
--     refusé, aucun écran ne le fait et le fichier resterait orphelin).
--   - Une fois le rapport pris en charge, la RLS lui refuse déjà tout (inchangé).
--   - L'admin garde tous ses droits de traitement (policy « Admins can update all
--     bug reports », inchangée). À la création, il est un auteur comme un autre.
--   - Le serveur (service_role, tâche système : pas d'utilisateur connecté) garde
--     la main.
--
-- Règle de la mise à jour : LISTE BLANCHE. Toute autre colonne changée,
-- d'aujourd'hui ou ajoutée plus tard, est refusée.
--
-- Exception écrite : `resolved_by` qui passe à NULL. La clé étrangère
-- `bug_reports_resolved_by_fkey` (ON DELETE SET NULL) met le rapport à jour quand
-- le compte de l'admin qui l'a résolu est supprimé, et cette mise à jour porte
-- l'identité du compte connecté à ce moment-là. Vider cette colonne ne donne rien
-- à l'auteur d'un rapport en attente.
--
-- Dates : `DEFAULT now()` et `now()` rendent tous deux l'heure de début de la
-- transaction ; une date laissée à la base est donc exactement égale à `now()`,
-- et une date envoyée par l'appelant ne l'est pas.
--
-- Ordre des triggers BEFORE UPDATE (alphabétique) : `guard_bug_report_reecriture_trg`
-- passe avant `update_bug_reports_updated_at`, donc un `updated_at` envoyé par
-- l'appelant est refusé ici au lieu d'être écrasé en silence.
--
-- Aucune policy touchée, aucune donnée modifiée. Prouvée par
-- tests/integration/rapports-de-bug-non-reecrits.test.ts (rouge sans elle).
--
-- Messages sans accent : PostgREST rend un 500 sans code sur un message accentué.
--
-- Rollback :
--   DROP TRIGGER IF EXISTS guard_bug_report_reecriture_trg ON public.bug_reports;
--   DROP TRIGGER IF EXISTS guard_bug_report_creation_trg ON public.bug_reports;
--   DROP FUNCTION IF EXISTS public.guard_bug_report_reecriture();
--   DROP FUNCTION IF EXISTS public.guard_bug_report_creation();
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. À la création
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_bug_report_creation() RETURNS trigger
	LANGUAGE plpgsql
	SET search_path TO 'public', 'pg_temp'
	AS $$
BEGIN
	-- Serveur (service_role, tâche système) : rien à garder.
	IF auth.uid() IS NULL THEN
		RETURN NEW;
	END IF;

	IF NEW.status IS DISTINCT FROM 'pending'
		OR NEW.resolution_notes IS NOT NULL
		OR NEW.resolved_by IS NOT NULL
		OR NEW.resolved_at IS NOT NULL
		OR NEW.screenshot_path IS NOT NULL
		OR NEW.screenshot_url IS NOT NULL
		OR NEW.created_at IS DISTINCT FROM now()
		OR NEW.updated_at IS DISTINCT FROM now()
	THEN
		RAISE EXCEPTION 'Un rapport de bug se cree en attente, sans capture, resolution ni date choisie'
			USING ERRCODE = '42501';
	END IF;

	RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_bug_report_creation() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_bug_report_creation_trg
	BEFORE INSERT ON public.bug_reports
	FOR EACH ROW
	EXECUTE FUNCTION public.guard_bug_report_creation();

-- ---------------------------------------------------------------------------
-- 2. À la modification
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_bug_report_reecriture() RETURNS trigger
	LANGUAGE plpgsql
	SET search_path TO 'public', 'pg_temp'
	AS $$
DECLARE
	v_changed text[];
	v_segments text[];
BEGIN
	-- Serveur (service_role, tâche système) : rien à garder.
	IF auth.uid() IS NULL THEN
		RETURN NEW;
	END IF;

	-- L'admin traite les rapports : ses droits ne changent pas.
	IF public.is_admin() THEN
		RETURN NEW;
	END IF;

	SELECT coalesce(array_agg(n.key), '{}') INTO v_changed
	FROM jsonb_each(to_jsonb(NEW)) n
	WHERE n.value IS DISTINCT FROM (to_jsonb(OLD) -> n.key);

	-- Suppression du compte de l'admin qui a résolu le rapport (ON DELETE SET NULL).
	IF v_changed = ARRAY['resolved_by'] AND NEW.resolved_by IS NULL THEN
		RETURN NEW;
	END IF;

	IF NOT v_changed <@ ARRAY['title', 'description', 'screenshot_path', 'screenshot_url'] THEN
		RAISE EXCEPTION 'Un rapport de bug envoye ne se reecrit pas'
			USING ERRCODE = '42501';
	END IF;

	IF NEW.screenshot_url IS DISTINCT FROM OLD.screenshot_url AND NEW.screenshot_url IS NOT NULL THEN
		RAISE EXCEPTION 'Adresse de capture non modifiable'
			USING ERRCODE = '42501';
	END IF;

	IF NEW.screenshot_path IS DISTINCT FROM OLD.screenshot_path THEN
		-- Rangement de l'application : <auteur>/<rapport>/<fichier>, rien d'autre
		-- (règle de isOwnScreenshotPath, src/lib/server/bug-report-screenshots.ts).
		-- Comparaison exacte, en minuscules comme `auth.uid()::text` : le stockage
		-- distingue la casse, un dossier en majuscules n'appartiendrait à personne.
		v_segments := string_to_array(coalesce(NEW.screenshot_path, ''), '/');
		IF coalesce(array_length(v_segments, 1), 0) <> 3
			OR v_segments[1] <> NEW.user_id::text
			OR v_segments[2] <> NEW.id::text
			OR v_segments[3] IN ('', '.', '..')
		THEN
			RAISE EXCEPTION 'Chemin de capture non conforme'
				USING ERRCODE = '42501';
		END IF;
	END IF;

	RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_bug_report_reecriture() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_bug_report_reecriture_trg
	BEFORE UPDATE ON public.bug_reports
	FOR EACH ROW
	EXECUTE FUNCTION public.guard_bug_report_reecriture();
