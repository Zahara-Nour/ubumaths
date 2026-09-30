-- Tentatives d'évaluation corrigées par le serveur (chantier 5, PR A)
-- ====================================================================
--
-- ADR 0015 et décisions Q32-Q39 de David (docs/wip/series-formes-progress.md,
-- 2026-09-30). Au démarrage d'une tentative, le SERVEUR (client service_role,
-- qui contourne la RLS) crée la séance (`test_sessions.evaluation_id` renseigné,
-- `completed_at` NULL = en cours), tire modèle + graine de chaque question et les
-- enregistre ; à l'envoi, il régénère, corrige, écrit `test_answers` (verdict,
-- points) et la note. Prod 2026-09-30 : 1 séance (entraînement libre), 0 séance
-- d'évaluation, 0 assignation → rien à reprendre.
--
-- ADDITIVE : une table, six colonnes nullables, des contraintes que toute ligne
-- existante respecte (colonnes neuves, toutes NULL). Côté droits, c'est une
-- RESTRICTION (Q38) : aucune donnée n'est perdue, des écritures disparaissent.
--
-- ── QUESTION D'ACCÈS (Q38, tranchée par David, EN MIROIR : qui perd quoi) ─────
--   · Élève destinataire, prof, admin, anon : ne créent PLUS de séance rattachée
--     à une évaluation par le client (seul le serveur, en service_role).
--     Avant : l'élève destinataire, le prof propriétaire et l'admin le pouvaient.
--   · Tout utilisateur : ne modifie PLUS directement ses séances (policy UPDATE
--     « Users can update own test sessions » supprimée), libres comprises. Mesuré :
--     aucun code de `src/` ne fait d'UPDATE sur test_sessions ; aucune policy
--     UPDATE/DELETE n'existe sur test_answers, ni DELETE sur test_sessions.
--   · Élève : n'ajoute PLUS de réponse à une séance d'évaluation.
--   · INCHANGÉ : entraînement libre, course libre, flash-cards (INSERT séance +
--     réponses par l'élève) ; lectures (l'élève lit ses séances et réponses, note,
--     points et verdicts compris — c'est sa note ; le prof lit celles de ses élèves).
--   · NOUVEAU, lu par PERSONNE hors service_role : `evaluation_attempt_questions`
--     (D18 : un élève ne lit jamais les graines, même de sa propre tentative, ni
--     pendant ni après ; le prof non plus). Lecture client = ERREUR 42501
--     (permission denied), pas zéro ligne : les droits sont révoqués.
--   ⚠️ ORDRE DE LIVRAISON : `/api/tests/save` écrit encore les séances
--   d'évaluation avec le client de l'élève. Après cette migration, l'envoi d'une
--   évaluation par ce code échoue (500) jusqu'à la PR B. Prod : 0 assignation.
--
-- ── CHOIX DES CLÉS ÉTRANGÈRES ────────────────────────────────────────────────
--   · evaluation_attempt_questions.test_session_id : CASCADE. La séance part
--     avec l'élève (test_sessions.user_id → auth.users ON DELETE CASCADE) :
--     l'effacement RGPD d'un mineur passe toujours, graines comprises (testé).
--   · evaluation_attempt_questions.template_id : NO ACTION (= refus, 23503).
--     Sans le modèle, la question ne se régénère plus : une tentative en cours ne
--     serait plus corrigeable, une tentative notée plus vérifiable. CASCADE
--     effacerait en silence des questions d'une tentative (note fausse) ; SET NULL
--     est impossible (colonne requise pour régénérer). Conséquence assumée :
--     supprimer un modèle déjà tiré dans une évaluation est refusé
--     (DELETE /api/questions/templates/[id] → 500) ; le passer en brouillon reste
--     possible. Ne gêne ni l'effacement d'un élève ni celui d'une séance.
--
-- ── IMMUABILITÉ DU RATTACHEMENT (130000) ─────────────────────────────────────
--   Le trigger `test_sessions_evaluation_immutable` reste : sans policy UPDATE,
--   aucun client ne peut plus changer `evaluation_id` (0 ligne), et le trigger
--   reste un second verrou ; service_role (auth.uid() NULL) garde la main.
--
-- ── ROLLBACK (une transaction, dans cet ordre) ───────────────────────────────
--   ⚠️ Perd les notes, points, verdicts et graines écrits depuis (DROP COLUMN /
--   DROP TABLE) : destructif dès que la PR B a tourné.
--   begin;
--   drop policy if exists "test_answers_insert_not_evaluation" on public.test_answers;
--   drop policy if exists "test_sessions_insert_not_evaluation" on public.test_sessions;
--   create policy "test_sessions_evaluation_assignee_only" on public.test_sessions
--     as restrictive for insert to authenticated
--     with check (
--       evaluation_id is null
--       or public.student_can_read_evaluation(evaluation_id)
--       or public.is_evaluation_owner(evaluation_id)
--       or public.is_admin()
--     );
--   create policy "Users can update own test sessions" on public.test_sessions
--     for update using (auth.uid() = user_id);
--   drop table if exists public.evaluation_attempt_questions;
--   alter table public.test_sessions drop constraint if exists test_sessions_grade_when_completed;
--   alter table public.test_sessions drop column if exists grade;
--   alter table public.test_sessions drop column if exists points_earned;
--   alter table public.test_answers drop column if exists points;
--   alter table public.test_answers drop column if exists status;
--   commit;

-- ============================================================================
-- 1. Questions tirées par le serveur (graines) — service_role seul
-- ============================================================================

create table public.evaluation_attempt_questions (
	test_session_id uuid not null
		references public.test_sessions(id) on delete cascade, -- RGPD : cf. en-tête
	position integer not null,
	template_id uuid not null
		references public.question_templates(id), -- NO ACTION : cf. en-tête
	seed integer not null,
	delay_seconds integer not null,
	category_key text not null,
	created_at timestamptz not null default now(),
	primary key (test_session_id, position),
	constraint evaluation_attempt_questions_position_check check (position >= 0),
	-- 0..2^31-1 : `integer` s'arrête déjà à 2^31-1 ; on exclut les négatifs
	constraint evaluation_attempt_questions_seed_check check (seed >= 0),
	-- Délai d'une question du panier : 1..300 s (Zod) ; marge jusqu'à 600
	constraint evaluation_attempt_questions_delay_check check (delay_seconds between 1 and 600),
	constraint evaluation_attempt_questions_category_key_check check (
		char_length(category_key) between 1 and 200
	)
);

comment on table public.evaluation_attempt_questions is
	'Questions d''une tentative d''évaluation, tirées par le serveur (modèle + graine), pour les régénérer et les corriger à l''envoi. service_role SEULEMENT : ni l''élève ni le prof ne lisent les graines (D18).';
comment on column public.evaluation_attempt_questions.position is 'Rang de la question dans la tentative (0, 1, …), unique par séance.';

create index idx_evaluation_attempt_questions_template
	on public.evaluation_attempt_questions (template_id);

-- RLS activée, AUCUNE policy, droits révoqués : double porte fermée.
alter table public.evaluation_attempt_questions enable row level security;
revoke all on public.evaluation_attempt_questions from public, anon, authenticated;
grant all on public.evaluation_attempt_questions to service_role;

-- ============================================================================
-- 2. Note et verdicts (nullables, sans défaut : NULL = pas de note)
-- ============================================================================

alter table public.test_sessions
	add column grade numeric(3, 1),
	add column points_earned numeric(6, 1);

alter table public.test_sessions
	add constraint test_sessions_grade_check check (
		grade is null or (grade between 0 and 20 and grade * 2 = trunc(grade * 2))
	),
	add constraint test_sessions_points_earned_check check (
		points_earned is null or (points_earned >= 0 and points_earned * 2 = trunc(points_earned * 2))
	),
	-- Une tentative en cours n'a pas de note
	add constraint test_sessions_grade_when_completed check (
		grade is null or completed_at is not null
	);
-- (Pas de CHECK « note ⇒ evaluation_id » : il bloquerait la procédure admin de
-- 20260930130000 qui détache les séances avant de supprimer un profil prof.
-- Qu'un client ne se fabrique pas de note est tenu par la policy INSERT, §3.)

comment on column public.test_sessions.grade is
	'Note sur 20 au demi-point, écrite par le serveur à l''envoi (évaluation seulement). NULL = pas (encore) de note.';
comment on column public.test_sessions.points_earned is
	'Somme des points des réponses (barème Q35), écrite par le serveur. NULL hors évaluation.';

alter table public.test_answers
	add column points numeric(2, 1),
	add column status text;

alter table public.test_answers
	add constraint test_answers_points_check check (points is null or points in (0, 0.5, 1)),
	add constraint test_answers_status_check check (
		status is null or status in ('correct', 'unoptimal_form', 'bad_form', 'incorrect', 'empty')
	);

comment on column public.test_answers.points is 'Points de la réponse (0, 0,5 ou 1), verdict du serveur. NULL = non corrigée par le serveur.';
comment on column public.test_answers.status is 'Verdict du serveur. NULL = non corrigée par le serveur.';

-- ============================================================================
-- 3. Q38 : plus d'écriture directe sur une évaluation
-- ============================================================================

-- Remplace la restrictive de 20260930130000 : plus AUCUN client ne rattache une
-- séance à une évaluation, même destinataire, prof ou admin ; et aucun client ne
-- se fabrique une note sur une séance libre (colonnes neuves : personne ne perd rien).
drop policy "test_sessions_evaluation_assignee_only" on public.test_sessions;

create policy "test_sessions_insert_not_evaluation" on public.test_sessions
	as restrictive
	for insert to authenticated, anon
	with check (evaluation_id is null and grade is null and points_earned is null);

-- Plus aucune modification directe de ses séances (toutes formes).
drop policy "Users can update own test sessions" on public.test_sessions;

-- Réponses : seulement dans une séance libre. Forme POSITIVE (« la séance
-- parente existe et est libre ») : si la séance était invisible, le refus tient.
create policy "test_answers_insert_not_evaluation" on public.test_answers
	as restrictive
	for insert to authenticated, anon
	with check (
		exists (
			select 1 from public.test_sessions ts
			where ts.id = test_answers.test_session_id
				and ts.evaluation_id is null
		)
	);
