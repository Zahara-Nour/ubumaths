-- Mathoux : décorations de panse, achetées en gidouilles dans la Chatterie (lot B)
-- ==============================================================================
--
-- Phase 0 validée par David le 2026-10-24 (docs/wip/mathoux-accessoires-progress.md,
-- « Lot B : comportements validés ») :
--   - six décorations, catalogue fixé : cœur 10, étoile 10, petite gidouille 20,
--     cocarde 20, médaille 40, blason 40 (dessins dans le code, `MathouAvatar`) ;
--   - achetée une fois, elle orne UN SEUL Mathou à la fois ; la poser ailleurs la
--     déplace, gratuitement ; retrait gratuit ; une décoration au plus par Mathou ;
--     ni échange ni revente ;
--   - achat atomique : solde vérifié, débit, décoration donnée et posée sur le
--     Mathou choisi, ligne au journal (« Chatterie : cocarde achetée », −20) ;
--   - refus : décoration inconnue, Mathou d'un autre élève ou pas né ; achat
--     réservé aux élèves. Le consentement (comme la boutique VIP) est vérifié par
--     la route, avant l'appel.
--
-- QUESTION D'ACCÈS (tranchée par David en phase 0, le 2026-10-24) :
--   - l'élève LIT ses décorations, jamais celles d'un autre élève ;
--   - le prof lit celles de ses élèves (`is_my_student`), l'admin celles de tous
--     (`is_teacher_or_admin`) : calque exact des policies SELECT de `student_mathoux` ;
--   - le visiteur non connecté (`anon`) n'a AUCUN droit ;
--   - personne n'écrit au client connecté : `authenticated` n'a que SELECT sur la
--     table neuve, et la colonne `student_mathoux.decoration` suit sa table (SELECT
--     seul). Achat et pose passent par deux fonctions exécutables par
--     `service_role` seul (droits ET garde dans le corps).
--   Personne ne perd d'accès : rien n'est retiré.
--
-- Garanties tenues par la base, pas seulement par les fonctions :
--   - « achetée » : la clé (student_id, decoration) de `student_mathoux` pointe
--     vers les achats de CE même élève ;
--   - « un seul Mathou à la fois » : index unique partiel (student_id, decoration).
--
-- Concurrence : les deux fonctions verrouillent la ligne `profiles` de l'élève
-- (FOR UPDATE), comme `pay_mathou_milestones` : un double clic se sérialise, le
-- second appel trouve la décoration déjà achetée et ne débite rien.
--
-- Plafond du lot A : il ne compte que les lignes POSITIVES « Chatterie : … » ;
-- les achats (négatifs) ne le touchent pas.
--
-- Effacement RGPD : `student_id` en ON DELETE CASCADE vers `profiles`.
--
-- Additive : une table neuve, une colonne nullable, deux fonctions neuves.
--
-- Preuve : tests/integration/mathoux-decorations.test.ts (rouge sans la migration).
--
-- ROLLBACK (à exécuter tel quel) :
--   drop function if exists public.buy_mathou_decoration(uuid, text, uuid);
--   drop function if exists public.set_mathou_decoration(uuid, uuid, text);
--   drop function if exists public.mathou_decoration_catalog(text);
--   alter table public.student_mathoux drop column if exists decoration;
--   drop table if exists public.student_mathou_decorations;
--   (les gidouilles dépensées restent dépensées, avec leur ligne au journal.)

-- ---------------------------------------------------------------------------
-- 1. Les décorations achetées
-- ---------------------------------------------------------------------------

create table public.student_mathou_decorations (
	student_id uuid not null references public.profiles (id) on delete cascade,
	decoration text not null,
	price_paid integer not null,
	purchased_at timestamptz not null default now(),

	constraint student_mathou_decorations_pkey primary key (student_id, decoration),
	constraint student_mathou_decorations_decoration_check
		check (decoration in ('heart', 'star', 'gidouille', 'cockade', 'medal', 'coat_of_arms')),
	constraint student_mathou_decorations_price_paid_check check (price_paid >= 0)
);

comment on table public.student_mathou_decorations is
	'Décorations de panse achetées par les élèves dans la Chatterie (une fois chacune). Lecture : l''élève les siennes, le prof et l''admin celles des élèves. Écriture : buy_mathou_decoration seule (serveur).';
comment on column public.student_mathou_decorations.student_id is
	'Élève (profiles.id). Supprimer le compte supprime ses décorations (cascade, effacement RGPD).';
comment on column public.student_mathou_decorations.decoration is
	'Clé du catalogue : heart, star, gidouille, cockade, medal, coat_of_arms.';
comment on column public.student_mathou_decorations.price_paid is
	'Gidouilles débitées à l''achat.';
comment on column public.student_mathou_decorations.purchased_at is
	'Date de l''achat.';

revoke all on public.student_mathou_decorations from public, anon, authenticated;
grant select on public.student_mathou_decorations to authenticated;

alter table public.student_mathou_decorations enable row level security;

create policy "Students can view their own mathou decorations" on public.student_mathou_decorations
	for select to authenticated using (student_id = auth.uid());

create policy "Teachers can view mathou decorations of their students" on public.student_mathou_decorations
	for select to authenticated using (public.is_my_student(student_id));

create policy "Teachers and admins can view all mathou decorations" on public.student_mathou_decorations
	for select to authenticated using (public.is_teacher_or_admin());

-- ---------------------------------------------------------------------------
-- 2. La décoration portée par chaque Mathou
-- ---------------------------------------------------------------------------

alter table public.student_mathoux
	add column decoration text;

-- Achetée par CET élève. SET NULL sur la seule colonne `decoration` (PG 15+) : un
-- achat supprimé (compte effacé) laisse le Mathou nu au lieu de bloquer.
alter table public.student_mathoux
	add constraint student_mathoux_decoration_fkey
		foreign key (student_id, decoration)
		references public.student_mathou_decorations (student_id, decoration)
		on delete set null (decoration);

-- Un seul Mathou à la fois ; sert aussi la clé étrangère ci-dessus.
create unique index student_mathoux_decoration_once
	on public.student_mathoux (student_id, decoration)
	where decoration is not null;

comment on column public.student_mathoux.decoration is
	'Décoration de panse portée (clé du catalogue), NULL si aucune. Achetée par l''élève, portée par un seul de ses Mathoux. Écrite par buy_mathou_decoration et set_mathou_decoration seules.';

-- ---------------------------------------------------------------------------
-- 3. Catalogue (prix et libellé du journal) : seule source de vérité des prix
-- ---------------------------------------------------------------------------
-- Rend NULL pour une clé inconnue. Interne : appelée par les deux fonctions.

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
		('coat_of_arms', 40, 'blason acheté')
	) as c (decoration, price, label)
	where c.decoration = p_decoration;
$function$;

comment on function public.mathou_decoration_catalog(text) is
	'Prix et libellé d''achat d''une décoration de panse des Mathoux. Interne (serveur seul).';

revoke all on function public.mathou_decoration_catalog(text) from public, anon, authenticated;
grant execute on function public.mathou_decoration_catalog(text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Achat (et pose sur le Mathou choisi)
-- ---------------------------------------------------------------------------
-- Rend { ok: true, balance } ou { ok: false, reason[, missing] } ; reason parmi
-- unknown_decoration, mathou_not_found, already_owned, insufficient_funds.

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
	if v_price is null then
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

	update public.student_mathoux m
	set decoration = p_decoration
	where m.student_id = p_student_id and m.notion_id = p_notion_id;

	insert into public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
	values (p_student_id, v_class_id, -v_price, v_prefix || v_label, null);

	return jsonb_build_object('ok', true, 'balance', v_balance - v_price);
end;
$function$;

comment on function public.buy_mathou_decoration(uuid, text, uuid) is
	'Achète une décoration de panse et la pose sur le Mathou choisi : solde vérifié, débit, ligne au journal, en une transaction. Rend {ok, balance} ou {ok: false, reason, missing?}. Serveur seul (service_role).';

revoke all on function public.buy_mathou_decoration(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.buy_mathou_decoration(uuid, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Pose, déplacement, retrait (gratuits)
-- ---------------------------------------------------------------------------
-- p_decoration NULL : retire la décoration du Mathou. Sinon la pose sur ce Mathou
-- en la retirant de celui qui la portait, et remplace celle qu'il portait.
-- Rend { ok: true } ou { ok: false, reason } ; reason parmi unknown_decoration,
-- mathou_not_found, not_owned.

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
		and not exists (select 1 from public.mathou_decoration_catalog(p_decoration)) then
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
	'Pose (en la déplaçant), remplace ou retire (NULL) la décoration de panse d''un Mathou, gratuitement. Rend {ok} ou {ok: false, reason}. Serveur seul (service_role).';

revoke all on function public.set_mathou_decoration(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_mathou_decoration(uuid, uuid, text) to service_role;
