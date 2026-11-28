-- Palotin : semaine déjà fêtée (chantier `regularite`, PR B2).
--
-- Besoin (décidé par David le 2026-11-12, docs/wip/regularite-progress.md § PR B2) : le
-- Palotin fête la 1re activité de la semaine et les 3, 5 et 10 semaines actives d'affilée,
-- une seule fois. Les deux moments tombent au même instant (la semaine devient active) :
-- on retient le lundi de la dernière semaine fêtée.
--
-- Question d'accès (tranchée par David le 2026-11-12) : PERSONNE de plus. La colonne vit
-- dans `student_last_visits`, lisible par le serveur seul (RLS sans policy, droits retirés
-- à anon et authenticated, migration 20261021210000). Le serveur n'en transmet que le
-- moment à fêter.
--
-- Qui gagne quoi : personne. Qui perd quoi : rien (colonne neuve, NULL partout).
--
-- Rollback (sans perte utile : une semaine déjà fêtée pourrait l'être une 2e fois) :
--   ALTER TABLE public.student_last_visits DROP COLUMN IF EXISTS week_celebrated_on;

ALTER TABLE public.student_last_visits
  -- Lundi (heure de Paris) de la dernière semaine fêtée par le Palotin ; NULL sinon
  ADD COLUMN week_celebrated_on date;

COMMENT ON COLUMN public.student_last_visits.week_celebrated_on IS
  'Lundi de la dernière semaine fêtée par le Palotin (1re activité, semaines d''affilée) : serveur seulement (2026-11-12).';
