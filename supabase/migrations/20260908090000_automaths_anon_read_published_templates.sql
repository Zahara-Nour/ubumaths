-- ============================================================================
-- /automaths : lecture des templates publiés par les visiteurs anonymes
-- ============================================================================
--
-- PROBLÈME
-- --------
-- Les trois routes publiques `/automaths`, `/automaths/test` et
-- `/automaths/panier` renvoient 500 « Failed to load questions » en production
-- pour tout visiteur déconnecté.
--
-- Les trois policies de `question_templates` s'appliquent au rôle PUBLIC (donc
-- aussi à `anon`) et font toutes un `EXISTS (SELECT 1 FROM profiles ...)`, sans
-- passer par un helper SECURITY DEFINER. Or `anon` n'a pas — et ne doit pas
-- avoir — de SELECT sur `profiles` : c'est précisément l'incident C2 de l'audit
-- de sécurité d'août 2026 (dump de PII de mineurs).
--
-- Évaluer ces policies sous `anon` lève donc :
--     ERROR: permission denied for table profiles
-- La requête échoue au lieu de renvoyer une liste vide, d'où le 500.
--
-- Les policies permissives étant combinées par OU, ajouter une policy `anon`
-- ne suffirait PAS : les trois policies existantes resteraient évaluées pour
-- `anon` et continueraient d'échouer. Il faut donc les restreindre au rôle
-- `authenticated`.
--
-- SOLUTION
-- --------
-- 1. Restreindre les trois policies existantes à `authenticated`. Aucun
--    changement fonctionnel : elles testent toutes `auth.uid()`, qui est NULL
--    pour un visiteur anonyme — elles n'ont jamais rien accordé à `anon`.
-- 2. Ajouter une policy `anon` en lecture seule, limitée aux templates
--    publiés, et SANS aucune lecture de `profiles`.
--
-- PORTÉE DE L'EXPOSITION
-- ----------------------
-- Un visiteur anonyme pourra lire toutes les colonnes des templates dont
-- `status = 'published'`, y compris `variations` (qui contient les réponses).
-- C'est inhérent à /automaths, qui génère les questions dans le navigateur.
-- Les brouillons et les archives restent inaccessibles.
--
-- Migration ADDITIVE : elle n'ouvre rien de plus aux utilisateurs connectés et
-- ne touche à aucune autre table.
-- ============================================================================

-- 1. Les policies qui lisent `profiles` ne concernent que les comptes connectés
ALTER POLICY "Admins can manage question templates"
	ON public.question_templates
	TO authenticated;

ALTER POLICY "Students can view published templates"
	ON public.question_templates
	TO authenticated;

ALTER POLICY "Teachers can view question templates"
	ON public.question_templates
	TO authenticated;

-- 2. Lecture publique des seuls templates publiés
DROP POLICY IF EXISTS "Anon can view published templates" ON public.question_templates;

CREATE POLICY "Anon can view published templates"
	ON public.question_templates
	FOR SELECT
	TO anon
	USING (status = 'published');

COMMENT ON POLICY "Anon can view published templates" ON public.question_templates IS
	'/automaths est une page publique : un visiteur sans compte doit pouvoir parcourir les questions publiées. Ne lit pas profiles (cf. incident C2, audit 2026-08).';

-- 3. Défense en profondeur : `anon` n'a aucune raison d'écrire ici
--
-- La RLS bloque déjà les écritures (aucune policy anon en INSERT/UPDATE/DELETE),
-- mais le rôle conserve les GRANTs hérités de l'`ALTER DEFAULT PRIVILEGES … TO
-- anon` qui fut la cause racine de l'audit d'août 2026. Retirer le grant ajoute
-- un second niveau : une policy trop permissive introduite plus tard ne
-- suffirait plus à ouvrir l'écriture.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.question_templates FROM anon;

-- ============================================================================
-- ROLLBACK
-- ============================================================================
-- Pour revenir en arrière :
--
--   DROP POLICY IF EXISTS "Anon can view published templates" ON public.question_templates;
--   ALTER POLICY "Admins can manage question templates"  ON public.question_templates TO public;
--   ALTER POLICY "Students can view published templates" ON public.question_templates TO public;
--   ALTER POLICY "Teachers can view question templates"  ON public.question_templates TO public;
--   -- facultatif, seulement si l'on veut rétablir l'état antérieur exact :
--   GRANT INSERT, UPDATE, DELETE ON public.question_templates TO anon;
--
-- ⚠️ `ALTER POLICY` n'accepte pas `IF EXISTS` : cette migration cassera si
-- l'une des trois policies est renommée. Leurs noms sont figés dans le
-- baseline (20260616220000) et identiques en production.
