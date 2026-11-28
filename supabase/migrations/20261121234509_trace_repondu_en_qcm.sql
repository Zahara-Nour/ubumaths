-- =============================================================================
-- Trace : « répondu en QCM » (chantier `idees-format`, idée 4, PR 1)
-- =============================================================================
--
-- Migration ADDITIVE : une colonne booléenne sur `skill_attempts`, fausse par
-- défaut (les traces existantes restent « en saisie »), et un CHECK de cohérence.
-- Le code qui l'écrit vient dans une PR suivante (après `db:types`).
--
-- Pourquoi : un prof peut faire répondre une case en QCM (bonne réponse et erreurs
-- prévues, idée 4). Une réussite en QCM est une demi-réussite pour la révision
-- espacée ; la trace dit la forme pour que les bilans ne mêlent pas les clics et
-- les réponses tapées (Q5, tranchée par David le 2026-11-21).
--
-- Accès (question tranchée par David, Q5) : aucune policy touchée. Les policies de
-- `skill_attempts` sont par ligne — l'élève lit les siennes, le prof celles de ses
-- élèves (`is_my_student`) —, la colonne neuve les suit. Personne ne lit une ligne
-- qu'il ne lisait pas avant.
--
-- Cohérence EN BASE (un élève insère ses traces directement par PostgREST) : vrai
-- seulement pour une réponse corrigée par l'application (`source = 'auto'`), là où
-- l'élève répond à une case : Saisie, Contrôle blanc, Course aux nombres, contrôle.
-- Ni Flash-cards ni révision (auto-évaluées), ni combat de la Descente (hors
-- périmètre de l'idée 4).
--
-- Rollback (aucune donnée perdue tant que le code n'écrit pas la colonne) :
--   alter table public.skill_attempts
--     drop constraint chk_trace_answered_as_choice_place,
--     drop column answered_as_choice;
-- =============================================================================

alter table public.skill_attempts
	add column answered_as_choice boolean not null default false;

comment on column public.skill_attempts.answered_as_choice is
	'Vrai si l''élève a répondu en QCM à une case que le prof a mise « en QCM » (bonne réponse et erreurs prévues). Saisie, Contrôle blanc, Course aux nombres, contrôle seulement. Faux : réponse tapée, ou trace antérieure.';

alter table public.skill_attempts
	add constraint chk_trace_answered_as_choice_place check (
		not answered_as_choice
		or (
			source = 'auto'
			and coalesce(place in ('typing', 'mock_test', 'number_race', 'evaluation'), false)
		)
	);
