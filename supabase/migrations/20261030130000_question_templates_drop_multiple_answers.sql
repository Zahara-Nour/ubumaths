-- Chantier figure-et-choix (ADR 0033) : les QCM sont devenus des cases choix (#1950).
-- « Plusieurs bonnes réponses » se règle désormais dans l'énoncé (`plusieurs: oui`
-- du bloc ```choix) ; la colonne `multiple_answers` n'est plus lue ni écrite par le
-- code livré (v0.57.1) et est vide en prod (0 ligne non nulle sur 1418, 2026-10-30).
-- Aucune fonction ni vue ne la lit.
--
-- Destructive : validée par David le 2026-10-30.
-- Rollback (la colonne revient vide, aucune donnée à restaurer) :
--   alter table public.question_templates add column multiple_answers boolean;

alter table public.question_templates drop column if exists multiple_answers;
