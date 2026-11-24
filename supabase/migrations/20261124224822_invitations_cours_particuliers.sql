-- ============================================================================
-- Invitations de cours particulier : un lien au parent, sans code de classe
-- ============================================================================
-- Chantier `invitation-cours-particulier` (docs/wip/invitation-cours-particulier-progress.md),
-- PR 1. L'admin saisit prénom, adresse du parent et niveau ; le parent reçoit un lien
-- (7 jours, usage unique) qui créera le compte, la classe et recueillera CGU +
-- consentement (PR 3).
--
-- QUESTION D'ACCÈS (tranchée par David, décision 7 du 2026-11-24) : seuls l'admin et le
-- prof lisent les invitations (prénom, adresse du parent, niveau, état) ; la page du
-- parent ne voit que l'invitation de son propre lien : prénom, niveau, nom de l'école,
-- échéance — jamais l'adresse du parent. Personne d'autre.
--
-- PORTES : aucune policy `anon`, aucune écriture par un compte connecté (créer,
-- renvoyer, annuler envoient ou coupent un courriel : c'est le serveur qui le fait, en
-- service role, après sa garde de rôle). La lecture par le lien est réservée au
-- service role. Les liens sont stockés HACHÉS (sha256) : une copie de la base n'ouvre
-- aucune invitation.
--
-- RÉGLAGE D'ÉCOLE (point A, tranché par David) : `schools.is_private_lessons`, posé sur
-- Akadada. Une seule école au plus. Lisible comme le reste de `schools` (policy
-- « Anyone can view schools ») : dire qu'une école est celle des cours particuliers
-- n'ouvre rien de nouveau. Il resservira au social borné au groupe (2026-10-21).
--
-- ADDITIVE : une colonne, une table, une fonction neuves ; une seule donnée touchée
-- (le réglage d'Akadada).
--
-- ROLLBACK :
--   drop function if exists public.get_private_lesson_invitation(text);
--   drop table if exists public.private_lesson_invitations;
--   drop index if exists public.idx_schools_one_private_lessons;
--   alter table public.schools drop column if exists is_private_lessons;
--   (⚠️ perd les invitations en attente : les parents tombent sur « lien plus
--   valable ». Aucune donnée d'élève n'est touchée.)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Réglage « école de cours particuliers » (point A)
-- ---------------------------------------------------------------------------
alter table public.schools
	add column if not exists is_private_lessons boolean not null default false;

comment on column public.schools.is_private_lessons is
	'École de cours particuliers (Akadada) : invitations par lien au parent, une classe par élève. Une seule école au plus.';

create unique index if not exists idx_schools_one_private_lessons
	on public.schools (is_private_lessons)
	where is_private_lessons;

-- Akadada existe en production, une seule école de ce nom (relevé du 2026-11-24 ; deux
-- lignes feraient échouer l'index unique, donc la migration) ; ailleurs (bases locale et de
-- test), aucune ligne : rien n'est touché. Une école au nom proche mais pas exact (renommée
-- entre-temps) arrête la migration plutôt que de la laisser passer sans réglage.
do $$
declare
	v_count integer;
begin
	update public.schools set is_private_lessons = true where name = 'Akadada';
	get diagnostics v_count = row_count;
	if v_count = 0 and exists (select 1 from public.schools where name ilike '%akadada%') then
		raise exception 'Ecole Akadada introuvable sous son nom exact : reglage non pose.';
	end if;
	if v_count = 0 then
		raise notice 'Aucune ecole Akadada (base locale ou de test) : reglage non pose.';
	end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Invitations
-- ---------------------------------------------------------------------------
create table if not exists public.private_lesson_invitations (
	id uuid primary key default gen_random_uuid(),
	school_id uuid not null references public.schools(id) on delete cascade,
	-- Prénom seul (minimisation) ; la règle fine (lettres, espaces, tirets,
	-- apostrophes) est celle du schéma Zod du serveur.
	firstname text not null
		constraint private_lesson_invitations_firstname check (char_length(firstname) between 1 and 50),
	-- Contact du parent, jamais un identifiant de connexion ; minuscules (le serveur
	-- normalise, la base le vérifie). Même format que `parental_consents.valid_email_format` :
	-- l'adresse est recopiée dans le consentement à l'utilisation (PR 3).
	parent_email text not null
		constraint private_lesson_invitations_parent_email check (
			char_length(parent_email) <= 254
			and parent_email = lower(parent_email)
			and parent_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
		),
	-- Niveau donné par l'admin (décision 4), repris par la classe créée : même liste que
	-- `classes_grade_check` (20261007210000), sinon la classe ne pourrait pas naître.
	grade text not null
		constraint private_lesson_invitations_grade check (grade = any (array[
			'CP', 'CE1', 'CE2', 'CM1', 'CM2',
			'6', '5', '4', '3',
			'2', '1_GEN', 'T_GEN', '1_SPE', 'T_SPE', 'T_EXP', 'T_COMP', '1_TECHNO', 'T_TECHNO'
		])),
	-- sha256 (hex) du jeton ; le jeton en clair n'est jamais stocké. « Renvoyer »
	-- remplace l'empreinte : l'ancien lien ne marche plus (phase 0).
	token_hash text not null unique
		constraint private_lesson_invitations_token_hash check (token_hash ~ '^[0-9a-f]{64}$'),
	-- 7 jours après l'envoi (décision 2), posé par le serveur.
	expires_at timestamptz not null,
	-- Envoi du lien ACTUEL : null tant que son courriel n'est pas parti (Brevo refuse →
	-- non compté, phase 0). « Renvoyer » remet la colonne à null avec la nouvelle empreinte,
	-- puis la pose si le courriel part : la liste ne dit jamais « envoyée » à tort.
	email_sent_at timestamptz,
	-- Courriels partis, tous liens confondus ; plafond contre l'abus de renvois (comme
	-- `parental_consents.max_email_count`).
	sent_count integer not null default 0
		constraint private_lesson_invitations_sent_count check (sent_count between 0 and 5),
	cancelled_at timestamptz,
	-- Réservation du lien pendant la création du compte (PR 3) : le serveur la pose par un
	-- `update … where claimed_at is null or claimed_at < now() - interval '5 minutes'`
	-- atomique, la retire si la création échoue (le lien reste valable). Deux validations
	-- simultanées : une seule réserve, donc un seul compte. Un serveur tombé en route ne tue
	-- pas le lien : la réservation se périme.
	claimed_at timestamptz,
	used_at timestamptz,
	-- Posés à l'utilisation (PR 3) : le compte et la classe créés. Compte effacé (droit à
	-- l'effacement) : l'invitation part avec lui, adresse du parent comprise.
	student_id uuid references public.profiles(id) on delete cascade,
	class_id uuid references public.classes(id) on delete set null,
	-- Posé par le serveur (id de l'admin vérifié) : en service role, auth.uid() est null.
	created_by uuid references public.profiles(id) on delete set null,
	created_at timestamptz not null default now(),
	constraint private_lesson_invitations_cancelled_or_used check (
		cancelled_at is null or used_at is null
	),
	constraint private_lesson_invitations_created_only_when_used check (
		(student_id is null and class_id is null) or used_at is not null
	)
);

comment on table public.private_lesson_invitations is
	'Invitations de cours particulier : lien au parent (7 jours, usage unique, stocké haché) qui crée le compte et la classe de l''enfant. Lues par le prof et l''admin, écrites par le serveur seul.';

-- Liste des invitations en attente de l'admin.
create index if not exists idx_private_lesson_invitations_pending
	on public.private_lesson_invitations (school_id, created_at desc)
	where cancelled_at is null and used_at is null;

alter table public.private_lesson_invitations enable row level security;

drop policy if exists "Teachers and admins read private lesson invitations"
	on public.private_lesson_invitations;
create policy "Teachers and admins read private lesson invitations"
	on public.private_lesson_invitations for select
	to authenticated
	using (public.is_teacher_or_admin());

-- Les DEUX révocations : le baseline pose des droits par défaut pour `anon` ET
-- `authenticated`. Droits PAR COLONNE : jamais l'empreinte du lien.
revoke all on public.private_lesson_invitations from public, anon, authenticated;
grant select (
	id, school_id, firstname, parent_email, grade, expires_at, email_sent_at, sent_count,
	cancelled_at, claimed_at, used_at, student_id, class_id, created_by, created_at
) on public.private_lesson_invitations to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Lecture par le lien (page du parent)
-- ---------------------------------------------------------------------------
-- Rend l'invitation de CE lien, encore valable : prénom, niveau, école, échéance.
-- Utilisée, annulée, expirée, inconnue, mal formée : null, toujours la même réponse
-- (rien n'est révélé sur une invitation qui ne marche plus).
create or replace function public.get_private_lesson_invitation(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
	v_result jsonb;
begin
	if p_token is null or char_length(p_token) not between 32 and 128 then
		return null;
	end if;

	select jsonb_build_object(
		'firstname', i.firstname,
		'grade', i.grade,
		'school_name', s.name,
		'expires_at', i.expires_at
	) into v_result
	from public.private_lesson_invitations i
	join public.schools s on s.id = i.school_id
	where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
		and i.cancelled_at is null
		and i.used_at is null
		and i.expires_at > now();

	return v_result;
end;
$$;

comment on function public.get_private_lesson_invitation(text) is
	'Invitation de cours particulier lue par son lien (page du parent) : prénom, niveau, école, échéance ; null si plus valable. Service role seul.';

revoke execute on function public.get_private_lesson_invitation(text) from public, anon, authenticated;
grant execute on function public.get_private_lesson_invitation(text) to service_role;
