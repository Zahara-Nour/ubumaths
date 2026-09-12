-- Quitter une classe, c'est aussi quitter son salon et ses cartes
-- ===============================================================
--
-- Cinquième volet, prérequis à l'archivage comme geste produit.
--
-- `trigger_add_student_to_class_chat` était AFTER **INSERT** seulement, et
-- `trg_cleanup_kanban_assignees_on_class_leave` AFTER **DELETE** seulement.
-- Aucun des deux ne connaissait l'archivage, et aucun code applicatif ne
-- touche `conversation_participants` — le retrait d'un élève de sa classe
-- (`/api/admin/remove-from-class`) ne fait qu'un DELETE sur `class_members`.
--
-- Deux trous, donc :
--   - un élève ARCHIVÉ restait dans le salon de groupe de la classe quittée ;
--   - un élève RETIRÉ y restait aussi. Ce second trou n'a jamais mordu — zéro
--     participant orphelin en production — faute de retrait effectué, mais il
--     n'en était pas moins ouvert.
--
-- Le salon d'une classe est du contenu de classe, et l'école est la frontière
-- safeguarding. C'est le défaut le plus lourd de la série.
--
-- ⚠️ CONSÉQUENCE ASSUMÉE : retiré du salon, l'élève perd l'accès à
-- l'historique du groupe, y compris à ses propres messages, qui restent en
-- base attribués à lui. Un message de groupe n'est pas une donnée personnelle
-- au même titre qu'un signalement d'erreur — il appartient à la conversation.
-- La sortie est réversible : réactiver l'adhésion y fait rentrer.
--
-- CE QUI NE BOUGE PAS : le professeur n'est pas membre au sens de
-- `class_members`, rien ici ne le déloge du salon qu'il a créé.
--
-- Préventif au 2026-09-13 : 78 adhésions, toutes actives, zéro orphelin.
--
-- ROLLBACK :
--   drop trigger sync_class_chat_membership on public.class_members;
--   drop function public.sync_class_chat_membership();
--   create trigger trigger_add_student_to_class_chat after insert on
--     public.class_members for each row execute function public.add_student_to_class_chat();
--   drop trigger cleanup_kanban_assignees_on_archive on public.class_members;

-- 1. Le salon de classe suit l'adhésion, dans les deux sens.
create or replace function public.sync_class_chat_membership()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_conversation_id uuid;
	v_class_id uuid;
	v_student_id uuid;
	v_should_belong boolean;
begin
	v_class_id := coalesce(new.class_id, old.class_id);
	v_student_id := coalesce(new.student_id, old.student_id);

	-- L'élève appartient au salon tant que son adhésion existe ET qu'elle est
	-- active. Un DELETE (`new` nul) le fait sortir tout autant qu'un archivage.
	v_should_belong := (tg_op <> 'DELETE') and new.status = 'active';

	select id into v_conversation_id
	from conversations
	where class_id = v_class_id
		and is_group = true
	limit 1;

	if v_conversation_id is null then
		return coalesce(new, old);
	end if;

	if v_should_belong then
		insert into conversation_participants (conversation_id, user_id, joined_at)
		values (v_conversation_id, v_student_id, now())
		on conflict (conversation_id, user_id) do nothing;
	else
		delete from conversation_participants
		where conversation_id = v_conversation_id
			and user_id = v_student_id;
	end if;

	-- Une adhésion réattribuée : l'ANCIEN élève sort, quel que soit le statut
	-- de la nouvelle ligne.
	if tg_op = 'UPDATE' and old.student_id is distinct from new.student_id then
		delete from conversation_participants
		where conversation_id = v_conversation_id
			and user_id = old.student_id;
	end if;

	return coalesce(new, old);
end;
$function$;

-- Un seul trigger pour les trois transitions, en remplacement de celui qui ne
-- connaissait que l'entrée.
drop trigger if exists trigger_add_student_to_class_chat on public.class_members;
drop trigger if exists sync_class_chat_membership on public.class_members;
create trigger sync_class_chat_membership
	after insert or update or delete on public.class_members
	for each row
	execute function public.sync_class_chat_membership();

-- 2. Le kanban : l'archivage vaut départ, comme le retrait.
create or replace function public.cleanup_kanban_assignees_on_archive()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
	delete from public.kanban_card_assignees a
	using public.kanban_cards c,
		public.kanban_columns col,
		public.kanban_boards b
	where a.user_id = new.student_id
		and a.card_id = c.id
		and c.column_id = col.id
		and col.board_id = b.id
		and b.class_id = new.class_id;

	return new;
end;
$function$;

drop trigger if exists cleanup_kanban_assignees_on_archive on public.class_members;
create trigger cleanup_kanban_assignees_on_archive
	after update on public.class_members
	for each row
	when (old.status = 'active' and new.status <> 'active')
	execute function public.cleanup_kanban_assignees_on_archive();

comment on function public.sync_class_chat_membership() is
	'Le salon de groupe d''une classe suit l''adhésion : entrée à l''activation, sortie à l''archivage comme au retrait. Réversible.';
