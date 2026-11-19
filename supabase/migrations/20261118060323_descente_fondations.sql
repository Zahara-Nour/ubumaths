-- La Descente de la Vistule : fondations en base (chantier `navadra`, étape 1)
-- ==============================================================================
--
-- Conception : docs/wip/navadra-progress.md, § « Tranché » et § « Phase 0 de la v1 »
-- (validée par David le 2026-11-18). Le jeu de combats de Chiphre : l'élève combat
-- des Bêtes imprévues nées de ses besoins ; chaque coup ou sort se valide par une
-- question ; une notion maîtrisée fait gagner un coup ou un sort.
--
-- QUESTION D'ACCÈS (tranchée par David le 2026-11-18) :
--   - l'élève LIT ses Bêtes et ses coups gagnés, jamais ceux d'un autre élève ;
--   - le prof et l'admin n'en lisent RIEN : le carnet (les Bêtes vaincues) reste à
--     l'élève seul (question 7 de la phase 0) ;
--   - le visiteur non connecté (`anon`) n'a aucun droit ;
--   - personne n'écrit au client connecté : aucune policy INSERT / UPDATE / DELETE,
--     `authenticated` n'a que SELECT. Seul le serveur écrit (client service) ;
--   - les réponses en combat sont des traces ordinaires (`skill_attempts`), lieu
--     `descente`, écrites par le serveur seul : l'élève ne peut pas en forger. Le prof
--     les lit comme toute trace de ses élèves (ADR 0038), lieu « Descente » ;
--   - une victoire verse 1 gidouille (Bête ordinaire), 3 (grosse Bête), 0 (tutoriel),
--     4 au plus sur 24 heures glissantes ; la ligne « Descente : victoire contre … »
--     s'inscrit au journal des gidouilles, lu par le prof comme celles des autres jeux.
--   Qui perd quoi : l'élève, l'écriture d'une trace au lieu `descente`, qui n'existait
--   pas. Personne d'autre ne perd d'accès ; les tables sont neuves.
--
-- Contenu :
--   1. `student_beasts` : les Bêtes de l'élève (vivantes, reparties, vaincues). Le
--      carnet est la liste de ses Bêtes vaincues. Aucun texte libre : le bestiaire
--      (nom, allure) vit dans le code, la base ne garde que sa clé.
--   2. `student_combat_moves` : les coups et sorts gagnés en maîtrisant une notion.
--      Un coup gagné le reste (comme un Mathou ne rapetisse jamais). Les coups de
--      départ, un par Province, viennent du code et ne sont pas écrits.
--   3. `record_beast_victory` : marque la défaite et verse les gidouilles, plafonnées.
--   4. Lieu `descente` des traces, réservé au serveur.
--
-- Effacement RGPD : `student_id` en ON DELETE CASCADE vers `profiles`, lui-même en
-- cascade depuis `auth.users` : supprimer le compte supprime les lignes.
--
-- Additive : deux tables neuves, une fonction neuve, une valeur de lieu en plus, une
-- policy resserrée sur cette seule valeur neuve. Aucune donnée touchée.
--
-- Preuve : tests/integration/descente-fondations.test.ts.
--
-- ROLLBACK (à exécuter tel quel) :
--   alter policy "skill_attempts_insert_own_student" on public.skill_attempts
--     with check (
--       student_id = auth.uid()
--       and source = any (array['auto', 'srs', 'student_self'])
--       and code is null
--       and task_id is null
--       and place is distinct from 'evaluation'
--     );
--   comment on policy "skill_attempts_insert_own_student" on public.skill_attempts is
--     'L''élève insère ses propres traces en source auto/srs/student_self, jamais une trace de contrôle (place = evaluation : écrite par le serveur, ADR 0038). Famille B reste réservée au prof (skill_attempts_insert_teacher).';
--   ⚠️ la ligne suivante EFFACE des réponses d'élèves dès que l'étape 3 écrit des traces
--   « descente » : migration destructive, arrêt et go de David avant de la jouer.
--   delete from public.skill_attempts where place = 'descente';
--   alter table public.skill_attempts drop constraint chk_trace_place_values;
--   alter table public.skill_attempts add constraint chk_trace_place_values check (
--     place is null
--     or place in ('flash_cards', 'typing', 'mock_test', 'number_race', 'review', 'evaluation')
--   );
--   comment on column public.skill_attempts.place is
--     'Lieu de la réponse : flash_cards, typing (Saisie), mock_test (Contrôle blanc), number_race (Course aux nombres), review (révision), evaluation (contrôle). NULL : trace antérieure à l''ADR 0038.';
--   drop function if exists public.record_beast_victory(uuid, uuid, text);
--   drop table if exists public.student_combat_moves;
--   drop table if exists public.student_beasts;

-- ---------------------------------------------------------------------------
-- 1. Les Bêtes de l'élève
-- ---------------------------------------------------------------------------

create table public.student_beasts (
	id uuid primary key default gen_random_uuid(),
	student_id uuid not null references public.profiles (id) on delete cascade,
	beast_key text not null,
	kind text not null,
	province text not null,
	-- Point du programme dont le besoin a fait naître la Bête ; NULL pour le tutoriel.
	-- SET NULL : un point supprimé ne doit pas emporter le carnet de l'élève.
	point_id uuid references public.curriculum_points (id) on delete set null,
	max_hp integer not null,
	hp integer not null,
	appeared_at timestamptz not null default now(),
	leaves_at timestamptz,
	defeated_at timestamptz,
	rewarded_gidouilles integer,
	updated_at timestamptz not null default now(),

	constraint student_beasts_beast_key_check check (beast_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
		and length(beast_key) <= 40),
	constraint student_beasts_kind_check check (kind in ('ordinary', 'big', 'tutorial')),
	constraint student_beasts_province_check check (province in (
		'nombrilie', 'bedonstan', 'yoyolande', 'pifometrie', 'glitchistan', 'patatovie'
	)),
	constraint student_beasts_hp_check check (max_hp between 1 and 10000 and hp between 0 and max_hp),
	constraint student_beasts_rewarded_check check (
		rewarded_gidouilles is null
		or (defeated_at is not null and rewarded_gidouilles between 0 and 3)
	)
);

comment on table public.student_beasts is
	'La Descente de la Vistule : les Bêtes imprévues de l''élève (vivantes, reparties, vaincues). Le carnet = ses Bêtes vaincues. Lecture : l''élève les siennes seulement (ni prof ni admin). Écriture : serveur seul.';
comment on column public.student_beasts.beast_key is
	'Clé de la Bête dans le bestiaire du code (nom, allure, caractère). Minuscules, chiffres et tirets.';
comment on column public.student_beasts.kind is
	'ordinary (Bête ordinaire), big (grosse Bête de la semaine, en plusieurs combats), tutorial (combat guidé par Bordure, un par élève).';
comment on column public.student_beasts.province is
	'Province à laquelle la Bête est sensible : le domaine de la notion à travailler.';
comment on column public.student_beasts.point_id is
	'Point du programme dont le besoin a fait naître la Bête. NULL : tutoriel, ou point supprimé depuis.';
comment on column public.student_beasts.hp is
	'Points de vie restants. Une Bête ordinaire revient en pleine forme après une défaite de l''élève ; la grosse Bête garde ses blessures.';
comment on column public.student_beasts.leaves_at is
	'Départ prévu. NULL : la Bête reste jusqu''à sa défaite (notion à remédier).';
comment on column public.student_beasts.defeated_at is
	'Défaite de la Bête (posée par record_beast_victory). NULL : pas encore vaincue.';
comment on column public.student_beasts.rewarded_gidouilles is
	'Gidouilles versées à la victoire, après plafond (0 à 3). NULL : pas encore vaincue.';

create index idx_student_beasts_student on public.student_beasts (student_id, appeared_at desc);
create index idx_student_beasts_point on public.student_beasts (point_id) where point_id is not null;
-- Un seul tutoriel par élève : passé ou fini, il ne revient pas.
create unique index uq_student_beasts_one_tutorial on public.student_beasts (student_id)
	where kind = 'tutorial';

create trigger update_student_beasts_updated_at
	before update on public.student_beasts
	for each row execute function public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 2. Les coups et sorts gagnés
-- ---------------------------------------------------------------------------

create table public.student_combat_moves (
	student_id uuid not null references public.profiles (id) on delete cascade,
	move_key text not null,
	-- RESTRICT, comme student_mathoux : un nœud s'archive, il ne se supprime pas.
	notion_id uuid not null references public.classification_nodes (id) on delete restrict,
	earned_at timestamptz not null default now(),
	announced_at timestamptz,

	constraint student_combat_moves_pkey primary key (student_id, move_key),
	constraint student_combat_moves_move_key_check check (move_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
		and length(move_key) <= 60)
);

comment on table public.student_combat_moves is
	'La Descente de la Vistule : coups et sorts gagnés en maîtrisant une notion. Un coup gagné le reste. Lecture : l''élève les siens seulement (ni prof ni admin). Écriture : serveur seul.';
comment on column public.student_combat_moves.move_key is
	'Clé du coup ou du sort dans le code. Les coups de départ (un par Province) ne sont pas écrits ici.';
comment on column public.student_combat_moves.notion_id is
	'Notion dont la maîtrise a fait gagner le coup (classification_nodes, genre notion).';
comment on column public.student_combat_moves.announced_at is
	'Annonce du nouveau coup à l''élève par le jeu. NULL : pas encore annoncé.';

create index idx_student_combat_moves_notion on public.student_combat_moves (notion_id);

-- ---------------------------------------------------------------------------
-- 3. Droits et RLS : anon rien, authenticated lecture de ses lignes seulement
-- ---------------------------------------------------------------------------
-- Les privilèges par défaut du schéma donnent TOUT à authenticated sur une table
-- neuve : on repart de zéro. Sans INSERT / UPDATE / DELETE, une écriture au client
-- connecté rend 42501 avant même la RLS. service_role garde ses droits.

revoke all on public.student_beasts from public, anon, authenticated;
grant select on public.student_beasts to authenticated;
revoke all on public.student_combat_moves from public, anon, authenticated;
grant select on public.student_combat_moves to authenticated;

alter table public.student_beasts enable row level security;
alter table public.student_combat_moves enable row level security;

-- Une seule policy par table, à dessein : ni prof ni admin (carnet à l'élève seul).
create policy "Students can view their own beasts" on public.student_beasts
	for select to authenticated using (student_id = (select auth.uid()));

create policy "Students can view their own combat moves" on public.student_combat_moves
	for select to authenticated using (student_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. Victoire : défaite marquée et gidouilles plafonnées
-- ---------------------------------------------------------------------------
-- Barème (choix de David, 2026-11-18) : ordinaire 1, grosse 3, tutoriel 0 ; 4 au
-- plus sur 24 heures glissantes (pas de fuseau à choisir, comme la Chatterie).
-- Au-delà, la victoire est enregistrée sans gidouille : elle compte toujours comme
-- travail (les traces sont écrites à part, question par question). Une récompense
-- est coupée au plafond (grosse Bête à 3 quand il reste 1 : verse 1).
--
-- On compte ce qui a été versé par le libellé « Descente : » (l'élève n'écrit pas
-- `gidouilles_activity` ; un libellé du prof commençant ainsi ne ferait que RÉDUIRE
-- le plafond).
--
-- Concurrence : la ligne `profiles` de l'élève est verrouillée AVANT de compter les
-- 24 heures, puis la Bête : deux victoires simultanées se suivent ; la même Bête ne
-- se paie qu'une fois (la seconde la trouve vaincue).

create or replace function public.record_beast_victory(
	p_student_id uuid,
	p_beast_id uuid,
	p_beast_name text default null
)
returns table (paid integer, cap_reached boolean)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_cap constant integer := 4;
	v_prefix constant text := 'Descente : ';
	v_beast record;
	v_reward integer;
	v_used integer;
	v_paid integer;
	v_name text;
	v_class_id uuid;
begin
	-- Messages d'erreur sans accent, à dessein : PostgREST tronque un message accentué
	-- (« B » pour « Bête ») et rend une erreur 500 sans code SQLSTATE au client.

	-- Serveur seul (en plus des droits d'exécution, retirés à tous sauf service_role)
	if coalesce((select auth.role()), '') <> 'service_role' then
		raise exception 'Non autorise : victoire enregistree par le serveur seul'
			using errcode = '42501';
	end if;

	-- Verrou de l'élève : sérialise les versements, avant de compter les 24 heures
	perform 1 from public.profiles p
	where p.id = p_student_id and p.role = 'student'
	for update;
	if not found then
		raise exception 'Eleve introuvable : %', p_student_id using errcode = 'P0002';
	end if;

	select b.kind, b.defeated_at, b.leaves_at into v_beast
	from public.student_beasts b
	where b.id = p_beast_id and b.student_id = p_student_id
	for update;
	if not found then
		raise exception 'Bete introuvable pour cet eleve : %', p_beast_id using errcode = 'P0002';
	end if;
	if v_beast.defeated_at is not null then
		raise exception 'Bete deja vaincue : %', p_beast_id using errcode = '55000';
	end if;
	if v_beast.leaves_at is not null and v_beast.leaves_at <= now() then
		raise exception 'Bete repartie : %', p_beast_id using errcode = '55000';
	end if;

	v_reward := case v_beast.kind when 'ordinary' then 1 when 'big' then 3 else 0 end;

	-- Déjà versé par la Descente sur les 24 dernières heures
	select coalesce(sum(a.delta), 0)::integer into v_used
	from public.gidouilles_activity a
	where a.student_id = p_student_id
		and a.delta > 0
		and a.reason like v_prefix || '%'
		and a.created_at > now() - interval '24 hours';

	v_paid := greatest(0, least(v_reward, v_cap - v_used));

	update public.student_beasts b
	set defeated_at = now(), hp = 0, rewarded_gidouilles = v_paid
	where b.id = p_beast_id;

	if v_paid > 0 then
		v_name := left(coalesce(nullif(btrim(p_beast_name), ''), 'une Bête imprévue'), 80);

		-- Classe active : visibilité de la ligne au journal du prof (comme record_game_reward)
		select cm.class_id into v_class_id
		from public.class_members cm
		where cm.student_id = p_student_id and cm.status = 'active'
		limit 1;

		insert into public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
		values (p_student_id, v_class_id, v_paid, v_prefix || 'victoire contre ' || v_name, null);

		update public.profiles
		set gidouilles = coalesce(gidouilles, 0) + v_paid
		where id = p_student_id;
	end if;

	paid := v_paid;
	-- Le tutoriel ne touche jamais au plafond
	cap_reached := v_reward > 0 and v_used + v_paid >= v_cap;
	return next;
end;
$function$;

comment on function public.record_beast_victory(uuid, uuid, text) is
	'La Descente de la Vistule : marque la Bête vaincue et verse ses gidouilles (ordinaire 1, grosse 3, tutoriel 0), 4 au plus sur 24 heures glissantes, libellé « Descente : victoire contre … ». Refuse une Bête d''un autre élève, déjà vaincue ou repartie. Serveur seul (service_role).';

revoke all on function public.record_beast_victory(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.record_beast_victory(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Lieu `descente` des traces, réservé au serveur
-- ---------------------------------------------------------------------------

alter table public.skill_attempts drop constraint chk_trace_place_values;
alter table public.skill_attempts
	add constraint chk_trace_place_values check (
		place is null
		or place in ('flash_cards', 'typing', 'mock_test', 'number_race', 'review', 'evaluation', 'descente')
	);

comment on column public.skill_attempts.place is
	'Lieu de la réponse : flash_cards, typing (Saisie), mock_test (Contrôle blanc), number_race (Course aux nombres), review (révision), evaluation (contrôle), descente (combat de la Descente de la Vistule). NULL : trace antérieure à l''ADR 0038.';

alter policy "skill_attempts_insert_own_student" on public.skill_attempts
	with check (
		student_id = auth.uid()
		and source = any (array['auto', 'srs', 'student_self'])
		and code is null
		and task_id is null
		and (place is null or place not in ('evaluation', 'descente'))
	);

comment on policy "skill_attempts_insert_own_student" on public.skill_attempts is
	'L''élève insère ses propres traces en source auto/srs/student_self, jamais une trace de contrôle (evaluation) ni de combat (descente) : écrites par le serveur (ADR 0038, Descente de la Vistule). Famille B reste réservée au prof (skill_attempts_insert_teacher).';
