-- ============================================================================
-- Cartes VIP : deux fonctions de compensation, serveur seul
-- ============================================================================
--
-- Question d'accès (Q137 b, tranchée par David le 2026-10-03) : deux fonctions
-- NOUVELLES, exécutables par service_role seul. Personne ne gagne d'accès.
--
--   `grant_vip_cards_after_action` défausse ET attribue dans UNE transaction
--   (tout ou rien), après la consommation de la carte d'action par
--   `use_vip_card` ;
--   `restore_vip_card_instance` rend à l'élève sa carte d'action si cette étape
--   échoue.
--
-- Livrée AVANT la migration 20261003150000 (droits retirés aux comptes
-- connectés) : le code qui appelle ces fonctions ne part en production qu'une
-- fois elles présentes, et l'ancien code continue de marcher entre les deux.
--
-- Purement additive : aucune fonction, table, policy ni donnée existante
-- n'est touchée.
--
-- Leçon : EXECUTE est accordé à PUBLIC par défaut → REVOKE FROM PUBLIC, anon,
-- authenticated, puis GRANT à service_role.
--
-- ============================================================================
-- ROLLBACK (aucun appelant en production avant la livraison du code)
-- ============================================================================
--   DROP FUNCTION IF EXISTS public.grant_vip_cards_after_action(uuid, text, text[], text[], text, jsonb, jsonb);
--   DROP FUNCTION IF EXISTS public.restore_vip_card_instance(uuid, text, jsonb, text);
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Défausse + attribution en une transaction
-- ----------------------------------------------------------------------------
-- Appelée par les routes exchange / choose APRÈS `use_vip_card`. Tout ou
-- rien : une carte d'action ou une carte à défausser engagée sur le marché,
-- une carte à défausser absente ou déjà utilisée, ou une carte à attribuer
-- inconnue ou désactivée, lève une exception et annule la défausse comme les
-- attributions déjà faites. La route rend alors la carte d'action
-- (`restore_vip_card_instance`).
--
-- `p_action_instance_id` : la carte d'action déjà consommée. Contrôlée SOUS le
-- verrou du profil : `lock_cards` lit le même profil en FOR UPDATE, un
-- verrouillage concurrent est donc soit déjà visible, soit postérieur.
-- `p_award_card_ids` : un élément NULL = carte tirée au hasard (pondération
-- de `award_vip_card_no_cost`). Rend les instances créées, dans l'ordre.

CREATE FUNCTION public.grant_vip_cards_after_action(
	p_student_id uuid,
	p_action_instance_id text,
	p_discard_ids text[],
	p_award_card_ids text[],
	p_source text,
	p_discard_metadata jsonb DEFAULT '{}'::jsonb,
	p_award_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
	v_discard_count int := coalesce(array_length(p_discard_ids, 1), 0);
	v_award_count int := coalesce(array_length(p_award_card_ids, 1), 0);
	v_discard jsonb;
	v_before jsonb;
	v_after jsonb;
	v_card_id text;
	v_awarded_card_id text;
	v_new_instance text;
	v_awarded jsonb := '[]'::jsonb;
begin
	if v_award_count = 0 or v_award_count > 20 then
		raise exception 'Nombre de cartes à attribuer invalide : %', v_award_count;
	end if;

	if p_action_instance_id is null then
		raise exception 'Carte d''action manquante';
	end if;

	-- Verrouille l'inventaire pour toute la transaction.
	perform 1 from public.profiles where id = p_student_id for update;
	if not found then
		raise exception 'Profil introuvable : %', p_student_id;
	end if;

	-- La carte d'action ne peut pas être engagée sur le marché.
	if exists (
		select 1 from public.marketplace_locked_cards
		where card_instance_id = p_action_instance_id
	) then
		raise exception 'La carte d''action est engagée sur le marché';
	end if;

	if v_discard_count > 0 then
		-- Une carte d'action à plusieurs usages n'a pas de `usedAt` après
		-- `use_vip_card` : `discard_vip_cards` la défausserait.
		if p_action_instance_id = any(p_discard_ids) then
			raise exception 'La carte d''action ne peut pas être défaussée';
		end if;

		if exists (
			select 1 from public.marketplace_locked_cards
			where student_id = p_student_id and card_instance_id = any(p_discard_ids)
		) then
			raise exception 'Une carte à défausser est engagée sur le marché';
		end if;

		v_discard := public.discard_vip_cards(p_student_id, p_discard_ids, p_discard_metadata);
		-- `discard_vip_cards` saute en silence une carte absente ou déjà utilisée :
		-- on exige que TOUTES aient été défaussées.
		if not coalesce((v_discard->>'success')::boolean, false)
			or coalesce((v_discard->>'discarded_count')::int, -1) <> v_discard_count then
			raise exception 'Défausse incomplète : %', v_discard;
		end if;
	end if;

	foreach v_card_id in array p_award_card_ids
	loop
		if v_card_id is not null and not exists (
			select 1 from public.vip_card_templates where id = v_card_id and is_enabled
		) then
			raise exception 'Carte indisponible : %', v_card_id;
		end if;

		select vip_cards into v_before from public.profiles where id = p_student_id;
		v_awarded_card_id := public.award_vip_card_no_cost(
			p_student_id, v_card_id, p_source, p_award_metadata
		);
		select vip_cards into v_after from public.profiles where id = p_student_id;

		select k into v_new_instance
		from jsonb_object_keys(v_after) as k
		where not (coalesce(v_before, '{}'::jsonb) ? k)
		limit 1;

		v_awarded := v_awarded || jsonb_build_array(
			jsonb_build_object('card_id', v_awarded_card_id, 'instance_id', v_new_instance)
		);
	end loop;

	return jsonb_build_object('success', true, 'awarded', v_awarded);
end;
$function$;

COMMENT ON FUNCTION public.grant_vip_cards_after_action(uuid, text, text[], text[], text, jsonb, jsonb) IS
'Serveur seul (Q137 b). Défausse puis attribue des cartes VIP en une transaction : tout ou rien. Rend {success, awarded: [{card_id, instance_id}]}.';

-- ----------------------------------------------------------------------------
-- Rendre la carte d'action consommée
-- ----------------------------------------------------------------------------
-- Remet l'instance dans l'état lu par la route AVANT `use_vip_card`
-- (`p_snapshot`), à condition qu'elle soit EXACTEMENT dans l'état laissé par
-- cet appel : même modèle, une utilisation de moins (`usesRemaining`), et
-- `usedAt` égal à la valeur posée par `use_vip_card` (`p_expected_used_at` :
-- NULL s'il reste des usages, sinon l'horodatage qu'elle a rendu). Sinon une
-- autre requête a touché la carte entre-temps (nouvel usage, défausse…) : on
-- ne rend rien plutôt que d'écraser son effet.
-- Rend true si l'instance a été restaurée.

CREATE FUNCTION public.restore_vip_card_instance(
	p_student_id uuid,
	p_instance_id text,
	p_snapshot jsonb,
	p_expected_used_at text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
declare
	v_cards jsonb;
	v_current jsonb;
begin
	select vip_cards into v_cards from public.profiles where id = p_student_id for update;
	v_current := v_cards -> p_instance_id;

	if v_current is null
		or p_snapshot is null
		or v_current->>'cardId' is distinct from p_snapshot->>'cardId'
		or p_snapshot->>'usedAt' is not null
		or v_current->>'usedAt' is distinct from p_expected_used_at
		or coalesce((v_current->>'usesRemaining')::int, 1)
			<> coalesce((p_snapshot->>'usesRemaining')::int, 1) - 1 then
		return false;
	end if;

	update public.profiles
	set vip_cards = jsonb_set(v_cards, array[p_instance_id], p_snapshot), updated_at = now()
	where id = p_student_id;

	return true;
end;
$function$;

COMMENT ON FUNCTION public.restore_vip_card_instance(uuid, text, jsonb, text) IS
'Serveur seul (Q137 b). Rend une carte d''action consommée par use_vip_card quand la suite de l''action a échoué, si la carte est exactement dans l''état laissé par cet appel.';

REVOKE EXECUTE ON FUNCTION public.grant_vip_cards_after_action(uuid, text, text[], text[], text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_vip_card_instance(uuid, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_vip_cards_after_action(uuid, text, text[], text[], text, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_vip_card_instance(uuid, text, jsonb, text) TO service_role;
