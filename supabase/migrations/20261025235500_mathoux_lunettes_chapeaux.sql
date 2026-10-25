-- Mathoux : lunettes et chapeaux, achetés en gidouilles dans la Chatterie (lot D)
-- ==============================================================================
--
-- Phase 0 du 2026-10-25 (docs/wip/mathoux-chapeaux-lunettes-progress.md) :
--   - dix pièces, choisies par David sur la planche :
--       yeux : lunettes rondes 10, lunettes de soleil 10, monocle 20,
--              pince-nez 20, lunettes à gidouille 40 ;
--       tête : chapeau melon 10, béret 10, canotier 10, haut-de-forme 20,
--              chapeau pointu 20 ;
--   - mêmes règles que la panse et le cou (20261024235000, 20261025160000) :
--     achetée une fois, une pièce orne UN SEUL Mathou à la fois ; la poser
--     ailleurs la déplace, gratuitement ; retrait gratuit ; une pièce au plus par
--     emplacement ; les quatre emplacements se cumulent ; achat atomique et
--     journal identiques ;
--   - stockage (recommandation acceptée) : même catalogue, même table d'achats,
--     deux emplacements neufs, « yeux » (`eyes`) et « tête » (`head`) ; le Mathou
--     porte `glasses` et `hat` à côté de `decoration` et `collar`.
--   (Ce que le dessin fait de la couronne et de la sieste ne regarde pas la base.)
--
-- QUESTION D'ACCÈS (tranchée en phase 0, le 2026-10-25) : personne ne lit rien
-- de nouveau. Les pièces achetées vivent dans `student_mathou_decorations`
-- (l'élève les siennes, le prof et l'admin celles des élèves, `anon` rien) ; les
-- colonnes `student_mathoux.glasses` et `.hat` suivent leur table (SELECT seul
-- pour `authenticated`, droit de table, mêmes policies). Écriture :
-- `buy_mathou_decoration`, `set_mathou_glasses` et `set_mathou_hat`, exécutables
-- par `service_role` seul. Personne ne perd d'accès : rien n'est retiré.
--
-- Garanties tenues par la base (comme pour `collar`) :
--   - « achetée par CET élève » : clés (student_id, glasses) et (student_id, hat)
--     vers ses achats ;
--   - « un seul Mathou à la fois » : index uniques partiels ;
--   - « chaque pièce à son emplacement » : contraintes CHECK sur les quatre
--     colonnes (celles de `decoration` et `collar` n'acceptent déjà que leurs
--     clés : rien à changer).
--
-- Additive : contrainte d'achat élargie, deux colonnes nullables, deux fonctions
-- neuves, trois fonctions existantes remplacées à signature égale (catalogue,
-- emplacement, achat ; le code en place continue de marcher : ses clés se
-- comportent comme avant). `set_mathou_decoration` et `set_mathou_collar`
-- refusent déjà toute clé d'un autre emplacement : inchangées.
--
-- Preuve : tests/integration/mathoux-lunettes-chapeaux.test.ts (22/22 rouges
-- sans la migration).
--
-- ROLLBACK (à exécuter tel quel ; il efface les pièces achetées, qui
-- n'existaient pas avant) :
--   drop function if exists public.set_mathou_glasses(uuid, uuid, text);
--   drop function if exists public.set_mathou_hat(uuid, uuid, text);
--   alter table public.student_mathoux drop column if exists glasses;
--   alter table public.student_mathoux drop column if exists hat;
--   delete from public.student_mathou_decorations
--     where decoration in ('round_glasses', 'sunglasses', 'monocle', 'pince_nez',
--       'spiral_glasses', 'bowler', 'beret', 'boater', 'top_hat', 'pointed_hat');
--   alter table public.student_mathou_decorations drop constraint student_mathou_decorations_decoration_check;
--   alter table public.student_mathou_decorations add constraint student_mathou_decorations_decoration_check
--     check (decoration in ('heart', 'star', 'gidouille', 'cockade', 'medal', 'coat_of_arms',
--       'bell', 'bow_tie', 'leather', 'order_chain'));
--   puis rejouer les sections 3 et 4 de 20261025160000_mathoux_colliers.sql
--   (catalogue, emplacement et achat d'avant).
--   (les gidouilles dépensées restent dépensées, avec leur ligne au journal.)

-- ---------------------------------------------------------------------------
-- 1. Les achats acceptent lunettes et chapeaux
-- ---------------------------------------------------------------------------

alter table public.student_mathou_decorations
	drop constraint student_mathou_decorations_decoration_check;

alter table public.student_mathou_decorations
	add constraint student_mathou_decorations_decoration_check
		check (decoration in (
			'heart', 'star', 'gidouille', 'cockade', 'medal', 'coat_of_arms',
			'bell', 'bow_tie', 'leather', 'order_chain',
			'round_glasses', 'sunglasses', 'monocle', 'pince_nez', 'spiral_glasses',
			'bowler', 'beret', 'boater', 'top_hat', 'pointed_hat'
		));

comment on table public.student_mathou_decorations is
	'Décorations des Mathoux (panse, colliers, lunettes, chapeaux) achetées par les élèves dans la Chatterie (une fois chacune). Lecture : l''élève les siennes, le prof et l''admin celles des élèves. Écriture : buy_mathou_decoration seule (serveur).';
comment on column public.student_mathou_decorations.decoration is
	'Clé du catalogue. Panse : heart, star, gidouille, cockade, medal, coat_of_arms. Cou : bell, bow_tie, leather, order_chain. Yeux : round_glasses, sunglasses, monocle, pince_nez, spiral_glasses. Tête : bowler, beret, boater, top_hat, pointed_hat.';

-- ---------------------------------------------------------------------------
-- 2. Les lunettes et le chapeau portés par chaque Mathou
-- ---------------------------------------------------------------------------

alter table public.student_mathoux
	add column glasses text,
	add column hat text;

alter table public.student_mathoux
	add constraint student_mathoux_glasses_check
		check (glasses in ('round_glasses', 'sunglasses', 'monocle', 'pince_nez', 'spiral_glasses')),
	add constraint student_mathoux_hat_check
		check (hat in ('bowler', 'beret', 'boater', 'top_hat', 'pointed_hat'));

-- Un seul Mathou à la fois (une pièce achetée, un seul porteur).
create unique index student_mathoux_glasses_once
	on public.student_mathoux (student_id, glasses)
	where glasses is not null;

create unique index student_mathoux_hat_once
	on public.student_mathoux (student_id, hat)
	where hat is not null;

-- Achetées par CET élève ; un achat supprimé (compte effacé) laisse les yeux ou la tête nus
alter table public.student_mathoux
	add constraint student_mathoux_glasses_fkey
		foreign key (student_id, glasses)
		references public.student_mathou_decorations (student_id, decoration)
		on delete set null (glasses),
	add constraint student_mathoux_hat_fkey
		foreign key (student_id, hat)
		references public.student_mathou_decorations (student_id, decoration)
		on delete set null (hat);

comment on column public.student_mathoux.glasses is
	'Lunettes portées (clé du catalogue, emplacement yeux), NULL si aucune. Achetées par l''élève, portées par un seul de ses Mathoux. Écrit par buy_mathou_decoration et set_mathou_glasses seules.';
comment on column public.student_mathoux.hat is
	'Chapeau porté (clé du catalogue, emplacement tête), NULL si aucun. Acheté par l''élève, porté par un seul de ses Mathoux. Écrit par buy_mathou_decoration et set_mathou_hat seules.';

-- ---------------------------------------------------------------------------
-- 3. Catalogue : lunettes et chapeaux, et leur emplacement
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
		('order_chain', 40, 'collier de l''Ordre acheté'),
		('round_glasses', 10, 'lunettes rondes achetées'),
		('sunglasses', 10, 'lunettes de soleil achetées'),
		('monocle', 20, 'monocle acheté'),
		('pince_nez', 20, 'pince-nez acheté'),
		('spiral_glasses', 40, 'lunettes à gidouille achetées'),
		('bowler', 10, 'chapeau melon acheté'),
		('beret', 10, 'béret acheté'),
		('boater', 10, 'canotier acheté'),
		('top_hat', 20, 'haut-de-forme acheté'),
		('pointed_hat', 20, 'chapeau pointu acheté')
	) as c (decoration, price, label)
	where c.decoration = p_decoration;
$function$;

comment on function public.mathou_decoration_catalog(text) is
	'Prix et libellé d''achat d''une décoration des Mathoux (panse, collier, lunettes, chapeau). Interne (serveur seul).';

-- Rend 'belly' (panse), 'neck' (cou), 'eyes' (yeux), 'head' (tête) ou NULL pour
-- une clé inconnue. Interne.
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
		when p_decoration in ('round_glasses', 'sunglasses', 'monocle', 'pince_nez', 'spiral_glasses')
			then 'eyes'
		when p_decoration in ('bowler', 'beret', 'boater', 'top_hat', 'pointed_hat')
			then 'head'
	end;
$function$;

comment on function public.mathou_decoration_slot(text) is
	'Emplacement d''une décoration des Mathoux : belly (panse), neck (cou), eyes (yeux), head (tête), NULL si inconnue. Interne (serveur seul).';

-- `create or replace` garde les droits ; reposés quand même, au cas où.
revoke all on function public.mathou_decoration_catalog(text) from public, anon, authenticated;
grant execute on function public.mathou_decoration_catalog(text) to service_role;
revoke all on function public.mathou_decoration_slot(text) from public, anon, authenticated;
grant execute on function public.mathou_decoration_slot(text) to service_role;

-- ---------------------------------------------------------------------------
-- 4. Achat : posé à son emplacement (quatre emplacements)
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

	-- Achat neuf : aucun autre Mathou ne la porte encore (index unique respecté)
	if v_slot = 'neck' then
		update public.student_mathoux m
		set collar = p_decoration
		where m.student_id = p_student_id and m.notion_id = p_notion_id;
	elsif v_slot = 'eyes' then
		update public.student_mathoux m
		set glasses = p_decoration
		where m.student_id = p_student_id and m.notion_id = p_notion_id;
	elsif v_slot = 'head' then
		update public.student_mathoux m
		set hat = p_decoration
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
	'Achète une décoration (panse, collier, lunettes ou chapeau) et la pose à son emplacement sur le Mathou choisi : solde vérifié, débit, ligne au journal, en une transaction. Rend {ok, balance} ou {ok: false, reason, missing?}. Serveur seul (service_role).';

revoke all on function public.buy_mathou_decoration(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.buy_mathou_decoration(uuid, text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 5. Pose, déplacement, retrait des lunettes (gratuits)
-- ---------------------------------------------------------------------------
-- p_glasses NULL : retire les lunettes du Mathou. Sinon les pose sur ce Mathou en
-- les retirant de celui qui les portait, et remplace celles qu'il portait.
-- Rend { ok: true } ou { ok: false, reason } ; reason parmi unknown_decoration,
-- mathou_not_found, not_owned.

create or replace function public.set_mathou_glasses(
	p_student_id uuid,
	p_notion_id uuid,
	p_glasses text
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

	if p_glasses is not null
		and public.mathou_decoration_slot(p_glasses) is distinct from 'eyes' then
		return jsonb_build_object('ok', false, 'reason', 'unknown_decoration');
	end if;

	if not exists (
		select 1 from public.student_mathoux m
		where m.student_id = p_student_id and m.notion_id = p_notion_id
	) then
		return jsonb_build_object('ok', false, 'reason', 'mathou_not_found');
	end if;

	if p_glasses is not null and not exists (
		select 1 from public.student_mathou_decorations d
		where d.student_id = p_student_id and d.decoration = p_glasses
	) then
		return jsonb_build_object('ok', false, 'reason', 'not_owned');
	end if;

	-- Les retirer d'abord du Mathou qui les porte (index unique partiel)
	if p_glasses is not null then
		update public.student_mathoux m
		set glasses = null
		where m.student_id = p_student_id
			and m.glasses = p_glasses
			and m.notion_id <> p_notion_id;
	end if;

	update public.student_mathoux m
	set glasses = p_glasses
	where m.student_id = p_student_id and m.notion_id = p_notion_id;

	return jsonb_build_object('ok', true);
end;
$function$;

comment on function public.set_mathou_glasses(uuid, uuid, text) is
	'Pose (en les déplaçant), remplace ou retire (NULL) les lunettes d''un Mathou, gratuitement. Rend {ok} ou {ok: false, reason}. Serveur seul (service_role).';

revoke all on function public.set_mathou_glasses(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_mathou_glasses(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Pose, déplacement, retrait du chapeau (gratuits)
-- ---------------------------------------------------------------------------
-- p_hat NULL : retire le chapeau du Mathou. Sinon le pose sur ce Mathou en le
-- retirant de celui qui le portait, et remplace celui qu'il portait.
-- Rend { ok: true } ou { ok: false, reason } ; reason parmi unknown_decoration,
-- mathou_not_found, not_owned.

create or replace function public.set_mathou_hat(
	p_student_id uuid,
	p_notion_id uuid,
	p_hat text
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

	if p_hat is not null
		and public.mathou_decoration_slot(p_hat) is distinct from 'head' then
		return jsonb_build_object('ok', false, 'reason', 'unknown_decoration');
	end if;

	if not exists (
		select 1 from public.student_mathoux m
		where m.student_id = p_student_id and m.notion_id = p_notion_id
	) then
		return jsonb_build_object('ok', false, 'reason', 'mathou_not_found');
	end if;

	if p_hat is not null and not exists (
		select 1 from public.student_mathou_decorations d
		where d.student_id = p_student_id and d.decoration = p_hat
	) then
		return jsonb_build_object('ok', false, 'reason', 'not_owned');
	end if;

	-- Le retirer d'abord du Mathou qui le porte (index unique partiel)
	if p_hat is not null then
		update public.student_mathoux m
		set hat = null
		where m.student_id = p_student_id
			and m.hat = p_hat
			and m.notion_id <> p_notion_id;
	end if;

	update public.student_mathoux m
	set hat = p_hat
	where m.student_id = p_student_id and m.notion_id = p_notion_id;

	return jsonb_build_object('ok', true);
end;
$function$;

comment on function public.set_mathou_hat(uuid, uuid, text) is
	'Pose (en le déplaçant), remplace ou retire (NULL) le chapeau d''un Mathou, gratuitement. Rend {ok} ou {ok: false, reason}. Serveur seul (service_role).';

revoke all on function public.set_mathou_hat(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.set_mathou_hat(uuid, uuid, text) to service_role;
