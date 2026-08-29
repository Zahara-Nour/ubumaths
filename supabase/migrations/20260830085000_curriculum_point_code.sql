-- ============================================================================
-- Référentiel — code stable par point de programme
-- ============================================================================
-- Jusqu'ici l'identité métier d'un point était le couple (objectif, libellé).
-- Conséquence : renommer un point dans le markdown source produisait, au rejeu
-- du seed, un point NEUF — l'ancien restant en base avec ses tags d'exercices,
-- sa couverture de cahier de texte et l'historique d'acquisition des élèves.
--
-- Le code rend l'identité indépendante du libellé. Il est attribué une fois,
-- écrit dans le markdown, et ne change jamais — y compris si le point est
-- renommé, réordonné, ou déplacé sous un autre objectif.
--
-- Format : `<GRADE>-<NNN>`, ex. `1SPE-047`. Volontairement sans segment de
-- thème ni d'objectif : déplacer un point lors d'une réorganisation ne doit
-- pas invalider son code.
--
-- Nullable : les points créés à la main depuis la page Programme n'en ont pas
-- besoin — ils ne sont pas issus d'un markdown et personne ne les re-seedera.
-- ============================================================================

alter table public.curriculum_points add column code text;

-- Index unique NON partiel : Postgres autorise déjà plusieurs NULL dans un
-- index unique, et un prédicat partiel obligerait `ON CONFLICT (code)` à le
-- répéter pour pouvoir cibler l'index.
create unique index curriculum_points_code_unique
	on public.curriculum_points (code);

comment on column public.curriculum_points.code is
	'Identifiant stable issu du markdown source (ex. 1SPE-047). Ne change jamais, même si le libellé change — c''est lui qui permet au seed de re-synchroniser au lieu de dupliquer. NULL pour les points créés à la main dans l''app.';
