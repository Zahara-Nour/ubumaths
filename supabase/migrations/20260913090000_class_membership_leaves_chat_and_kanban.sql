-- Quitter une classe, c'est aussi quitter son salon et ses cartes
-- ===============================================================
--
-- Cinquième volet, prérequis à l'archivage comme geste produit.
--
-- `trigger_add_student_to_class_chat` était AFTER **INSERT** seulement, et
-- `trg_cleanup_kanban_assignees_on_class_leave` AFTER **DELETE** seulement.
-- Aucun des deux ne connaissait l'archivage, et aucun code applicatif ne
-- touche `conversation_participants` — `/api/admin/remove-from-class` se
-- contente d'un DELETE sur `class_members`.
--
-- Deux trous, donc :
--   - un élève ARCHIVÉ restait dans le salon de groupe de la classe quittée ;
--   - un élève RETIRÉ y restait aussi. Ce second trou n'a jamais mordu — zéro
--     participant orphelin en production, mesuré — faute de retrait effectué.
--
-- Le salon d'une classe est du contenu de classe, et l'école est la frontière
-- safeguarding.
--
-- ⚠️ CONSÉQUENCE ASSUMÉE, tranchée par David : retiré du salon, l'élève perd
-- l'accès à l'historique du groupe, y compris à ses propres messages, qui
-- restent en base attribués à lui. Un message de groupe appartient à la
-- conversation, pas à son auteur.
--
-- CONTRÔLE (0 en production au 2026-09-13, d'où l'absence de rattrapage) :
--   select count(*) from conversation_participants cp
--   join conversations c on c.id = cp.conversation_id
--   where c.is_group and c.class_id is not null
--     and c.created_by is distinct from cp.user_id
--     and not exists (select 1 from class_members cm
--                     where cm.class_id = c.class_id
--                       and cm.student_id = cp.user_id
--                       and cm.status = 'active');
--
-- ROLLBACK :
--   drop trigger sync_class_chat_membership on public.class_members;
--   drop trigger cleanup_kanban_assignees_on_move on public.class_members;
--   create trigger trigger_add_student_to_class_chat after insert on
--     public.class_members for each row execute function public.add_student_to_class_chat();
--   (`add_student_to_class_chat()` est laissée en base pour cette raison.)

-- ============================================================================
-- 1. Le salon de classe suit l'adhésion, dans les deux sens
-- ============================================================================
create or replace function public.sync_class_chat_membership()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_conversation_id uuid;
	v_should_belong boolean;
	v_transition boolean;
begin
	-- Une TRANSITION, pas n'importe quel UPDATE. Sans cette condition, un
	-- élève écarté du salon par le professeur — geste que les policies
	-- « Users can leave conversations » et « Teachers can remove participants »
	-- prévoient — y serait réintégré en silence au premier UPDATE venu de son
	-- adhésion. Une exclusion de modération ne doit pas se défaire toute seule.
	v_transition := tg_op <> 'UPDATE'
		or old.status is distinct from new.status
		or old.class_id is distinct from new.class_id
		or old.student_id is distinct from new.student_id;

	if not v_transition then
		return coalesce(new, old);
	end if;

	-- L'adhésion qui DISPARAÎT fait sortir : changement de classe, changement
	-- de titulaire, ou suppression pure. `coalesce` ne rend que le nouveau,
	-- d'où ces sorties explicites sur les valeurs d'AVANT.
	if tg_op = 'DELETE'
		or (tg_op = 'UPDATE' and (old.class_id is distinct from new.class_id
			or old.student_id is distinct from new.student_id))
	then
		for v_conversation_id in
			select c.id from conversations c
			where c.class_id = old.class_id and c.is_group = true
		loop
			delete from conversation_participants cp
			using conversations c
			where c.id = cp.conversation_id
				and cp.conversation_id = v_conversation_id
				and cp.user_id = old.student_id
				-- Jamais le créateur du salon : `class_members` n'est pas censée
				-- contenir un professeur, mais rien ne l'interdit — la table n'a
				-- pas de contrôle de rôle, et l'API d'ajout n'en fait pas non
				-- plus. Une seule ligne mal saisie éjecterait le professeur de
				-- sa propre conversation, sans moyen automatique d'y revenir.
				and c.created_by is distinct from old.student_id;
		end loop;
	end if;

	if tg_op = 'DELETE' then
		return old;
	end if;

	v_should_belong := new.status = 'active';

	-- Tous les salons de la classe, pas le premier venu : rien ne garantit
	-- l'unicité — aucune contrainte sur `conversations(class_id) where
	-- is_group` — et un `limit 1` sans ordre aurait choisi au hasard.
	for v_conversation_id in
		select c.id from conversations c
		where c.class_id = new.class_id and c.is_group = true
	loop
		if v_should_belong then
			insert into conversation_participants (conversation_id, user_id, joined_at)
			values (v_conversation_id, new.student_id, now())
			on conflict (conversation_id, user_id) do nothing;
		else
			delete from conversation_participants cp
			using conversations c
			where c.id = cp.conversation_id
				and cp.conversation_id = v_conversation_id
				and cp.user_id = new.student_id
				and c.created_by is distinct from new.student_id;
		end if;
	end loop;

	return new;
end;
$function$;

drop trigger if exists trigger_add_student_to_class_chat on public.class_members;
drop trigger if exists sync_class_chat_membership on public.class_members;
create trigger sync_class_chat_membership
	after insert or update or delete on public.class_members
	for each row
	execute function public.sync_class_chat_membership();

-- ============================================================================
-- 2. Le kanban : archivage et déménagement valent départ, comme le retrait
-- ============================================================================
--
-- ⚠️ Cette fonction cible OLD, comme sa jumelle du DELETE. Viser NEW aurait
-- retiré les cartes du NOUVEAU titulaire quand une adhésion change de mains,
-- en laissant celles de celui qui part : une sortie de trop et une sortie
-- manquante d'un seul coup.
create or replace function public.cleanup_kanban_assignees_on_move()
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
	where a.user_id = old.student_id
		and a.card_id = c.id
		and c.column_id = col.id
		and col.board_id = b.id
		and b.class_id = old.class_id;

	return new;
end;
$function$;

drop trigger if exists cleanup_kanban_assignees_on_archive on public.class_members;
drop trigger if exists cleanup_kanban_assignees_on_move on public.class_members;
create trigger cleanup_kanban_assignees_on_move
	after update on public.class_members
	for each row
	when (
		(old.status = 'active' and new.status <> 'active')
		or old.class_id is distinct from new.class_id
		or old.student_id is distinct from new.student_id
	)
	execute function public.cleanup_kanban_assignees_on_move();

-- ============================================================================
-- 3. La création d'un salon ne doit pas y remettre les archivés
-- ============================================================================
--
-- `create_class_chat_room()` recopie les membres de la classe dans le nouveau
-- salon, sans regarder leur statut. Elle n'est câblée que sur `AFTER INSERT ON
-- classes`, donc la classe est vide à cet instant — sauf import ou
-- restauration, où l'ordre n'est plus garanti. Six classes sur dix n'ont
-- aujourd'hui aucun salon : toute création a posteriori passerait par ici.
-- ⚠️ Recopiée à l'IDENTIQUE depuis la production, à une clause près. La
-- réécrire de mémoire m'avait fait perdre le suffixe « - Chat de classe » du
-- nom de la conversation, et introduire un retour anticipé qui changeait le
-- comportement quand aucun professeur n'existe. Seule la dernière requête
-- gagne `and cm.status = 'active'`.
create or replace function public.create_class_chat_room()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
DECLARE
  new_conversation_id UUID;
  v_teacher_id UUID;
BEGIN
  -- Mono-teacher: resolve the sole teacher (the class creator/owner).
  SELECT id INTO v_teacher_id
  FROM profiles
  WHERE role = 'teacher'
  LIMIT 1;

  -- Create a conversation for the new class
  INSERT INTO conversations (
    name,
    is_group,
    class_id,
    created_by,
    created_at
  ) VALUES (
    NEW.name || ' - Chat de classe', -- e.g., "6ème A - Chat de classe"
    true, -- is_group
    NEW.id, -- class_id
    v_teacher_id, -- created_by (sole teacher)
    NOW()
  )
  RETURNING id INTO new_conversation_id;

  -- Add the teacher as a participant
  IF v_teacher_id IS NOT NULL THEN
    INSERT INTO conversation_participants (
      conversation_id,
      user_id,
      joined_at
    ) VALUES (
      new_conversation_id,
      v_teacher_id,
      NOW()
    );
  END IF;

  -- Add all existing class members as participants.
  -- Les membres ARCHIVÉS sont exclus : sans cette clause, créer un salon pour
  -- une classe qui a déjà des membres y réintégrerait ceux qui l'ont quittée.
  INSERT INTO conversation_participants (
    conversation_id,
    user_id,
    joined_at
  )
  SELECT
    new_conversation_id,
    cm.student_id,
    NOW()
  FROM class_members cm
  WHERE cm.class_id = NEW.id
    AND cm.status = 'active';

  RETURN NEW;
END;
$function$;

comment on function public.sync_class_chat_membership() is
	'Le salon de groupe d''une classe suit l''adhésion : entrée à l''activation, sortie à l''archivage, au retrait et au changement de classe. Ne touche jamais le créateur du salon, et ne réintègre que sur une vraie transition.';
