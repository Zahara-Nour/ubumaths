-- Mathoux : colliers, achetés en gidouilles dans la Chatterie (lot C)
-- ====================================================================
--
-- Phase 0 du 2026-10-25 (docs/wip/mathoux-colliers-progress.md) :
--   - quatre colliers, choisis par David sur la planche : ruban à grelot 10,
--     nœud papillon 10, collier de cuir 20, collier de l'Ordre 40 ;
--   - mêmes règles que les décorations de panse (20261024235000) : acheté une
--     fois, il orne UN SEUL Mathou à la fois ; le poser ailleurs le déplace,
--     gratuitement ; retrait gratuit ; un collier au plus par Mathou ; il se
--     cumule avec la décoration de panse ; achat atomique et journal identiques ;
--   - stockage (recommandation acceptée) : les colliers sont des décorations du
--     même catalogue et de la même table d'achats, à l'emplacement « cou ». Le
--     Mathou porte au plus une décoration par emplacement : `decoration` (panse,
--     existante) et `collar` (cou, neuve).
--
-- QUESTION D'ACCÈS (tranchée en phase 0, le 2026-10-25) : personne ne lit rien
-- de nouveau. Les colliers achetés vivent dans `student_mathou_decorations`
-- (l'élève les siens, le prof et l'admin ceux des élèves, `anon` rien) ; la
-- colonne `student_mathoux.collar` suit sa table (SELECT seul pour
-- `authenticated`, mêmes policies). Écriture : `buy_mathou_decoration` et
-- `set_mathou_collar`, exécutables par `service_role` seul. Personne ne perd
-- d'accès : rien n'est retiré.
--
-- Garanties tenues par la base :
--   - « acheté par CET élève » : clé (student_id, collar) vers ses achats ;
--   - « un seul Mathou à la fois » : index unique partiel (student_id, collar) ;
--   - « chaque décoration à son emplacement » : contraintes CHECK sur
--     `decoration` (clés de panse) et `collar` (clés de cou).
--
-- Additive : contrainte d'achat élargie, colonne nullable, deux fonctions neuves,
-- deux fonctions existantes remplacées à signature égale (le code en place
-- continue de marcher : ses clés de panse se comportent comme avant).
--
-- Preuve : tests/integration/mathoux-colliers.test.ts (rouge sans la migration).
--
-- ROLLBACK (à exécuter tel quel ; il efface les colliers achetés, qui
-- n'existaient pas avant) :
--   drop function if exists public.set_mathou_collar(uuid, uuid, text);
--   alter table public.student_mathoux drop column if exists collar;
--   alter table public.student_mathoux drop constraint if exists student_mathoux_decoration_belly_check;
--   delete from public.student_mathou_decorations
--     where decoration in ('bell', 'bow_tie', 'leather', 'order_chain');
--   alter table public.student_mathou_decorations drop constraint student_mathou_decorations_decoration_check;
--   alter table public.student_mathou_decorations add constraint student_mathou_decorations_decoration_check
--     check (decoration in ('heart', 'star', 'gidouille', 'cockade', 'medal', 'coat_of_arms'));
--   drop function if exists public.mathou_decoration_slot(text);
--   puis rejouer les sections 3, 4 et 5 de 20261024235000_mathoux_decorations.sql
--   (catalogue, achat et pose d'avant).
--   (les gidouilles dépensées restent dépensées, avec leur ligne au journal.)

-- ---------------------------------------------------------------------------
-- 1. Les achats acceptent les colliers
-- ---------------------------------------------------------------------------

alter table public.student_mathou_decorations
	drop constraint student_mathou_decorations_decoration_check;

alter table public.student_mathou_decorations
	add constraint student_mathou_decorations_decoration_check
		check (decoration in (
			'heart', 'star', 'gidouille', 'cockade', 'medal', 'coat_of_arms',
			'bell', 'bow_tie', 'leather', 'order_chain'
		));

comment on table public.student_mathou_decorations is
	'Décorations des Mathoux (panse et colliers) achetées par les élèves dans la Chatterie (une fois chacune). Lecture : l''élève les siennes, le prof et l''admin celles des élèves. Écriture : buy_mathou_decoration seule (serveur).';
comment on column public.student_mathou_decorations.decoration is
	'Clé du catalogue. Panse : heart, star, gidouille, cockade, medal, coat_of_arms. Cou : bell, bow_tie, leather, order_chain.';

-- ---------------------------------------------------------------------------
-- 2. Le collier porté par chaque Mathou
-- ---------------------------------------------------------------------------

alter table public.student_mathoux
	add column collar text;

alter table public.student_mathoux
	add constraint student_mathoux_collar_check
		check (collar in ('bell', 'bow_tie', 'leather', 'order_chain'));

-- La panse ne porte que des décorations de panse (les lignes existantes en sont)
alter table public.student_mathoux
	add constraint student_mathoux_decoration_belly_check
		check (decoration in ('heart', 'star', 'gidouille', 'cockade', 'medal', 'coat_of_arms'));

-- Acheté par CET élève ; un achat supprimé (compte effacé) laisse le cou nu
alter table public.student_mathoux
	add constraint student_mathoux_collar_fkey
		foreign key (student_id, collar)
		references public.student_mathou_decorations (student_id, decoration)
		on delete set null (collar);

-- Un seul Mathou à la fois ; sert aussi la clé étrangère ci-dessus.
create unique index student_mathoux_collar_once
	on public.student_mathoux (student_id, collar)
	where collar is not null;

comment on column public.student_mathoux.collar is
	'Collier porté (clé du catalogue, emplacement cou), NULL si aucun. Acheté par l''élève, porté par un seul de ses Mathoux. Écrit par buy_mathou_decoration et set_mathou_collar seules.';

-- ---------------------------------------------------------------------------
-- 3. Catalogue : les colliers, et l'emplacement de chaque décoration
-- ---------------------------------------------------------------------------

create or replace function public.mathou_decoration_catalog(p_decoration text)
returns table (price integer, label text)
language sql
immutable
set search_path to 'public', 'pg_temp'
as $function$
	select c.price, c.label
	from (values
		('heart', 10, 'cœur acheté'),
		('star', 10, 'étoile achetée'),
		('gidouille', 20, 'petite gidouille achetée'),
		('cockade', 20, 'cocarde achetée'),
		('medal', 40, 'médaille achetée'),
		('coat_of_arms', 40, 'blason acheté'),
		('bell', 10, 'ruban à grelot acheté'),
		('bow_tie', 10, 'nœud papillon acheté'),
		('leather', 20, 'collier de cuir acheté'),
		('order_chain', 40, 'collier de l''Ordre acheté')
	) as c (decoration, price, label)
	where c.decoration = p_decoration;
$function$;

comment on function public.mathou_decoration_catalog(text) is
	'Prix et libellé d''achat d''une décoration des Mathoux (panse ou collier). Interne (serveur seul).';

-- Rend 'belly' (panse), 'neck' (cou) ou NULL pour une clé inconnue. Interne.
create or replace function public.mathou_decoration_slot(p_decoration text)
returns text
language sql
immutable
set search_path to 'public', 'pg_temp'
as $function$
	select case
		when p_decoration in ('heart', 'star', 'gidouille', 'cockade', 'medal', 'coat_of_arms')
			then 'belly'
		when p_decoration in ('bell', 'bow_tie', 'leather', 'order_chain')
			then 'neck'
	end;
$function$;

comment on function public.mathou_decoration_slot(text) is
	'Emplacement d''une décoration des Mathoux : belly (panse), neck (cou), NULL si inconnue. Interne (serveur seul).';

revoke all on function public.mathou_decoration_slot(text) from public, anon, authenticated;
grant execute on function public.mathou_decoration_slot(text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Achat : posé à son emplacement
-- ---------------------------------------------------------------------------
-- Même contrat qu'avant : { ok: true, balance } ou { ok: false, reason[, missing] }.

create or replace function public.buy_mathou_decoration(
	p_student_id uuid,
	p_decoration text,
	p_notion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_prefix constant text := 'Chatterie : ';
	v_price integer;
	v_label text;
	v_slot text;
	v_balance numeric;
	v_class_id uuid;
begin
	-- Serveur seul (en plus des droits d'exécution, retirés à tous sauf service_role)
	if coalesce((select auth.role()), '') <> 'service_role' then
		raise exception 'Non autorisé : achat réservé au serveur'
			using errcode = '42501';
	end if;

	-- Verrou de l'élève : sérialise achats et poses (double clic : un seul débit)
	select p.gidouilles into v_balance
	from public.profiles p
	where p.id = p_student_id and p.role = 'student'
	for update;
	if not found then
		raise exception 'Élève introuvable : %', p_student_id;
	end if;

	select c.price, c.label into v_price, v_label
	from public.mathou_decoration_catalog(p_decoration) c;
	v_slot := public.mathou_decoration_slot(p_decoration);
	if v_price is null or v_slot is null then
		return jsonb_build_object('ok', false, 'reason', 'unknown_decoration');
	end if;

	if not exists (
		select 1 from public.student_mathoux m
		where m.student_id = p_student_id and m.notion_id = p_notion_id
	) then
		return jsonb_build_object('ok', false, 'reason', 'mathou_not_found');
	end if;

	if exists (
		select 1 from public.student_mathou_decorations d
		where d.student_id = p_student_id and d.decoration = p_decoration
	) then
		return jsonb_build_object('ok', false, 'reason', 'already_owned');
	end if;

	if coalesce(v_balance, 0) < v_price then
		return jsonb_build_object(
			'ok', false,
			'reason', 'insufficient_funds',
			'missing', ceil(v_price - coalesce(v_balance, 0))::integer
		);
	end if;

	-- Classe active : visibilité de la ligne au journal du prof (comme pay_mathou_milestones)
	select cm.class_id into v_class_id
	from public.class_members cm
	where cm.student_id = p_student_id and cm.status = 'active'
	limit 1;

	update public.profiles
	set gidouilles = v_balance - v_price
	where id = p_student_id;

	insert into public.student_mathou_decorations (student_id, decoration, price_paid)
	values (p_student_id, p_decoration, v_price);

	if v_slot = 'neck' then
		update public.student_mathoux m
		set collar = p_decoration
		where m.student_id = p_student_id and m.notion_id = p_notion_id;
	else
		update public.student_mathoux m
		set decoration = p_decoration
		where m.student_id = p_student_id and m.notion_id = p_notion_id;
	end if;

	insert into public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
	values (p_student_id, v_class_id, -v_price, v_prefix || v_label, null);

	return jsonb_build_object('ok', true, 'balance', v_balance - v_price);
end;
$function$;

comment on function public.buy_mathou_decoration(uuid, text, uuid) is
	'Achète une décoration (panse ou collier) et la pose à son emplacement sur le Mathou choisi : solde vérifié, débit, ligne au journal, en une transaction. Rend {ok, balance} ou {ok: false, reason, missing?}. Serveur seul (service_role).';

-- ---------------------------------------------------------------------------
-- 5. Pose sur la panse : refuse un collier
-- ---------------------------------------------------------------------------
-- Même contrat qu'avant ; un collier y est une décoration inconnue.

create or replace function public.set_mathou_decoration(
	p_student_id uuid,
	p_notion_id uuid,
	p_decoration text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
	-- Serveur seul (en plus des droits d'exécution, retirés à tous sauf service_role)
	if coalesce((select auth.role()), '') <> 'service_role' then
		raise exception 'Non autorisé : pose réservée au serveur'
			using errcode = '42501';
	end if;

	-- Verrou de l'élève : sérialise achats et poses
	perform 1 from public.profiles p
	where p.id = p_student_id and p.role = 'student'
	for update;
	if not found then
		raise exception 'Élève introuvable : %', p_student_id;
	end if;

	if p_decoration is not null
		and public.mathou_decoration_slot(p_decoration) is distinct from 'belly' then
		return jsonb_build_object('ok', false, 'reason', 'unknown_decoration');
	end if;

	if not exists (
		select 1 from public.student_mathoux m
		where m.student_id = p_student_id and m.notion_id = p_notion_id
	) then
		return jsonb_build_object('ok', false, 'reason', 'mathou_not_found');
	end if;

	if p_decoration is not null and not exists (
		select 1 from public.student_mathou_decorations d
		where d.student_id = p_student_id and d.decoration = p_decoration
	) then
		return jsonb_build_object('ok', false, 'reason', 'not_owned');
	end if;

	-- La retirer d'abord du Mathou qui la porte (index unique partiel)
	if p_decoration is not null then
		update public.student_mathoux m
		set decoration = null
		where m.student_id = p_student_id
			and m.decoration = p_decoration
			and m.notion_id <> p_notion_id;
	end if;

	update public.student_mathoux m
	set decoration = p_decoration
	where m.student_id = p_student_id and m.notion_id = p_notion_id;

	return jsonb_build_object('ok', true);
end;
$function$;

comment on function public.set_mathou_decoration(uuid, uuid, text) is
	'Pose (en la déplaçant), remplace ou retire (NULL) la décoration de panse d''un Mathou, gratuitement ; refuse un collier (unknown_decoration). Rend {ok} ou {ok: false, reason}. Serveur seul (service_role).';

-- ---------------------------------------------------------------------------
-- 6. Pose, déplacement, retrait d'un collier (gratuits)
-- ---------------------------------------------------------------------------
-- p_collar NULL : retire le collier du Mathou. Sinon le pose sur ce Mathou en le
-- retirant de celui qui le portait, et remplace celui qu'il portait.
-- Rend { ok: true } ou { ok: false, reason } ; reason parmi unknown_decoration,
-- mathou_not_found, not_owned.

create or replace function public.set_mathou_collar(
	p_student_id uuid,
	p_notion_id uuid,
	p_collar text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
	-- Serveur seul (en plus des droits d'exécution, retirés à tous sauf service_role)
	if coalesce((select auth.role()), '') <> 'service_role' then
		raise exception 'Non autorisé : pose réservée au serveur'
			using errcode = '42501';
	end if;

	-- Verrou de l'élève : sérialise achats et poses
	perform 1 from public.profiles p
	where p.id = p_student_id and p.role = 'student'
	for update;
	if not found then
		raise exception 'Élève introuvable : %', p_student_id;
	end if;

	if p_collar is not null
		and public.mathou_decoration_slot(p_collar) is distinct from 'neck' then
		return jsonb_build_object('ok', false, 'reason', 'unknown_decoration');
	end if;

	if not exists (
		select 1 from public.student_mathoux m
		where m.student_id = p_student_id and m.notion_id = p_notion_id
	) then
		return jsonb_build_object('ok', false, 'reason', 'mathou_not_found');
	end if;

	if p_collar is not null and not exists (
		select 1 from public.student_mathou_decorations d
		where d.student_id = p_student_id and d.decoration = p_collar
	) then
		return jsonb_build_object('ok', false, 'reason', 'not_owned');
	end if;

	-- Le retirer d'abord du Mathou qui le porte (index unique partiel)
	if p_collar is not null then
		update public.student_mathoux m
		set collar = null
		where m.student_id = p_student_id
			and m.collar = p_collar
			and m.notion_id <> p_notion_id;
	end if;

	update public.student_mathoux m
	set collar = p_collar
	where m.student_id = p_student_id and m.notion_id = p_notion_id;

	return jsonb_build_object('ok', true);
end;
$function$;

comment on function public.set_mathou_collar(uuid, uuid, text) is
	'Pose (en le déplaçant), remplace ou retire (NULL) le collier d''un Mathou, gratuitement. Rend {ok} ou {ok: false, reason}. Serveur seul (service_role).';

revoke all on function public.set_mathou_collar(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_mathou_collar(uuid, uuid, text) to service_role;
