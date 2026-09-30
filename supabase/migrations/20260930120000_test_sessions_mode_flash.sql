-- Forme « Flash-cards » d'une série : nouvelle valeur `flash` pour test_sessions.mode
-- =================================================================================
--
-- Chantier « formes d'une série » (docs/wip/series-formes-progress.md, décision Q12
-- de David, 2026-09-30) : une séance de flash-cards s'enregistre comme les autres
-- formes (séance, réponses, FSRS, tentatives), avec mode = 'flash'.
--
-- QUESTION D'ACCÈS (posée à David et tranchée le 2026-09-30) :
--   Aucune policy n'est modifiée. Seule la liste des valeurs admises s'élargit.
--   · l'élève lit ses propres séances, désormais aussi ses séances de flash-cards ;
--   · le prof (is_my_student) lit celles de ses élèves, flash-cards comprises — validé ;
--   · un autre élève, un visiteur : rien, comme avant.
--
-- ADDITIVE : la contrainte est ÉLARGIE (une valeur de plus), aucune donnée n'est
-- touchée, toute ligne existante reste valide.
--
-- Usages vérifiés (2026-09-30) : `grep -n "test_sessions" supabase/migrations/*.sql`
-- → seules les vues d'évaluation lisent la table, par `assignment_id` (jamais par
-- `mode`) ; une séance de flash-cards n'a pas d'assignation.
--
-- ROLLBACK non destructif (garde les séances flash existantes, refuse les nouvelles) :
--   alter table public.test_sessions drop constraint test_sessions_mode_check;
--   alter table public.test_sessions add constraint test_sessions_mode_check
--     check (mode = any (array['display'::text, 'interactive'::text, 'course'::text])) not valid;
-- (Variante destructive : `delete from public.test_sessions where mode = 'flash'` avant de
-- recréer la contrainte validée — supprime aussi leurs test_answers en cascade.)

alter table public.test_sessions drop constraint test_sessions_mode_check;

alter table public.test_sessions add constraint test_sessions_mode_check
	check (mode = any (array['display'::text, 'interactive'::text, 'course'::text, 'flash'::text]));

comment on column public.test_sessions.mode is
	'Forme de la série : display (En classe), interactive (Entraînement), course (Course aux nombres), flash (Flash-cards)';
