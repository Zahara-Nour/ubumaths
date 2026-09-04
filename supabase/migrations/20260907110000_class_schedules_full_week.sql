-- Emploi du temps : ouvrir la semaine entière
-- ===========================================================================
--
-- `class_schedules.day_of_week` était contraint à 0-4, c'est-à-dire dimanche à
-- jeudi. La semaine de classe est pourtant une configuration par école
-- (`schools.timetable->week_config`) : un établissement en Lun-Ven ne pouvait
-- tout simplement pas enregistrer son vendredi, la base refusait la ligne.
--
-- La contrainte passe à 0-6. Ce sont les jours de classe de l'école qui
-- décident de ce qui est proposé dans l'interface, pas le schéma.
--
-- Purement permissif : aucune ligne existante ne peut violer la nouvelle borne,
-- puisqu'elle est plus large que l'ancienne. Rien à migrer, rien à réécrire.

ALTER TABLE public.class_schedules
  DROP CONSTRAINT IF EXISTS class_schedules_day_of_week_check;

ALTER TABLE public.class_schedules
  ADD CONSTRAINT class_schedules_day_of_week_check
  CHECK (day_of_week >= 0 AND day_of_week <= 6);

COMMENT ON COLUMN public.class_schedules.day_of_week IS
  'Jour de la semaine, 0 = dimanche à 6 = samedi. Les jours réellement ouverts dépendent de schools.timetable->week_config.';
