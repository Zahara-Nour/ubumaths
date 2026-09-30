-- Question figée au démarrage d'une tentative d'évaluation (chantier 5, Q42)
-- =========================================================================
--
-- Décision de David (Q42, 2026-10-01, docs/wip/series-formes-progress.md) : la
-- question vue par l'élève est FIGÉE au démarrage. Le serveur (client
-- service_role) enregistre l'instance complète générée — énoncé, cases, réponses
-- attendues, correction, choix mélangés : un objet JSON — dans
-- `evaluation_attempt_questions`. La reprise et la correction s'en servent, même
-- si le modèle est modifié entre-temps.
--
-- ADDITIVE : une colonne nullable, sans défaut ; deux CHECK que toute ligne
-- existante respecte (colonne neuve = NULL). Prod 2026-10-01 : 0 ligne.
--
-- ── QUESTION D'ACCÈS (tranchée par David) : AUCUN accès nouveau ──────────────
--   La table reste lisible et écrivable par service_role SEUL (20260930160000 :
--   RLS sans policy, REVOKE ALL public/anon/authenticated). ADD COLUMN ne crée
--   aucun GRANT de colonne (pg_attribute.attacl NULL) et les droits de table
--   révoqués couvrent la nouvelle colonne : lecture client = ERREUR 42501.
--   Testé : has_column_privilege(anon|authenticated, …, 'instance', …) = faux.
--   ⚠️ Cette colonne contient les RÉPONSES ATTENDUES : elle ne doit jamais
--   devenir lisible par un client (ni GRANT, ni vue, ni fonction SECURITY DEFINER
--   qui la renverrait avant la fin de la tentative).
--
-- ── BORNE DE TAILLE : 256 Kio de texte JSON ──────────────────────────────────
--   Une instance réelle pèse quelques Kio (énoncé, cases, correction en LaTeX) ;
--   256 Kio laissent une marge d'environ ×50 pour les corrections longues, tout en
--   empêchant qu'un bug du générateur (boucle, contenu répété) gonfle la table.
--   Mesure : octet_length(instance::text), déterministe. pg_column_size() est
--   écarté : il mesure la forme STOCKÉE, éventuellement compressée (TOAST) — un
--   contenu répétitif énorme passerait, et la même valeur pourrait être acceptée
--   ou refusée selon qu'elle arrive compressée ou non.
--
-- ── ROLLBACK ─────────────────────────────────────────────────────────────────
--   ⚠️ Perd les instances enregistrées depuis (DROP COLUMN) : les tentatives en
--   cours ne se reprennent plus à l'identique. Destructif dès que la PR B a tourné.
--   begin;
--   alter table public.evaluation_attempt_questions
--     drop constraint if exists evaluation_attempt_questions_instance_size_check,
--     drop constraint if exists evaluation_attempt_questions_instance_object_check,
--     drop column if exists instance;
--   commit;

alter table public.evaluation_attempt_questions
	add column instance jsonb;

alter table public.evaluation_attempt_questions
	add constraint evaluation_attempt_questions_instance_object_check check (
		instance is null or jsonb_typeof(instance) = 'object'
	),
	add constraint evaluation_attempt_questions_instance_size_check check (
		instance is null or octet_length(instance::text) <= 262144
	);

comment on column public.evaluation_attempt_questions.instance is
	'Instance complète de la question figée au démarrage (énoncé, cases, réponses attendues, correction, choix mélangés), écrite par le serveur. Reprise et correction s''en servent. service_role SEULEMENT : contient les réponses attendues. NULL = tentative antérieure à Q42.';
