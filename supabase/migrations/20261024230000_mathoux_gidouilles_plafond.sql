-- Mathoux : plafond des gidouilles des étapes, 20 sur 24 heures glissantes
-- ==============================================================================
--
-- Audit de sécurité de la PR #1689 : un élève peut enregistrer lui-même des
-- tentatives réussies (correction côté client, décision figée), donc faire naître
-- et grandir des Mathoux sans travailler, et encaisser leurs gidouilles (jusqu'à
-- environ 2 400). Choix de David (2026-10-24, recommandation acceptée) :
--   - plafond de 20 gidouilles des étapes sur les 24 dernières heures (glissantes :
--     pas de fuseau à choisir) ; un élève honnête l'atteint rarement (un Mathou né
--     matou rapporte 8, un grand matou et son étoile 15) ; le reste est versé aux
--     appels suivants, l'abus devient lent et visible au journal ;
--   - une étape n'est jamais coupée : si la suivante ne tient plus sous le
--     plafond, elle attend (et la ligne reste « non payée » pour elle) ;
--   - les libellés commencent par « Chatterie : » : c'est ainsi qu'on compte ce qui
--     a été versé (l'élève n'écrit pas `gidouilles_activity` ; un libellé du prof
--     commençant par « Chatterie : » ne ferait que RÉDUIRE le plafond).
--
-- QUESTION D'ACCÈS (tranchée par David le 2026-10-24) : personne ne lit rien de
-- neuf. Seuls le corps de `pay_mathou_milestones` et le texte des libellés
-- changent ; droits inchangés (CREATE OR REPLACE conserve proacl : EXECUTE à
-- service_role seul). Personne ne perd d'accès.
--
-- Concurrence : la ligne `profiles` de l'élève est verrouillée AVANT de compter
-- les 24 heures : deux versements simultanés se suivent, le second voit ce que
-- le premier a versé.
--
-- Non destructive : la fonction garde sa signature ; aucune donnée touchée.
--
-- Preuve : tests/integration/mathoux-gidouilles-etapes.test.ts (describe « plafond »).
--
-- ROLLBACK : rejouer le `create or replace function public.pay_mathou_milestones`
-- de 20261024210000_mathoux_gidouilles_etapes.sql (section 2), tel quel.

create or replace function public.pay_mathou_milestones(
	p_student_id uuid,
	p_names jsonb default '{}'::jsonb
)
returns table (notion_id uuid, delta integer, reason text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
	v_stages constant text[] := array['chaton', 'matou', 'grand_matou'];
	v_stage_rewards constant integer[] := array[3, 5, 10];
	v_star_reward constant integer := 5;
	v_cap constant integer := 20;
	v_prefix constant text := 'Chatterie : ';
	v_row record;
	v_name text;
	v_from integer;
	v_to integer;
	v_rank integer;
	v_paid_rank integer;
	v_grade text;
	v_paid_grades text[];
	v_blocked boolean;
	v_used integer;
	v_total integer := 0;
	v_class_id uuid;
begin
	-- Serveur seul (en plus des droits d'exécution, retirés à tous sauf service_role)
	if coalesce((select auth.role()), '') <> 'service_role' then
		raise exception 'Non autorisé : versement réservé au serveur'
			using errcode = '42501';
	end if;

	-- Verrou de l'élève : sérialise les versements, avant de compter les 24 heures
	perform 1 from public.profiles p
	where p.id = p_student_id and p.role = 'student'
	for update;
	if not found then
		raise exception 'Élève introuvable : %', p_student_id;
	end if;

	-- Déjà versé pour les étapes sur les 24 dernières heures
	select coalesce(sum(a.delta), 0)::integer into v_used
	from public.gidouilles_activity a
	where a.student_id = p_student_id
		and a.delta > 0
		and a.reason like v_prefix || '%'
		and a.created_at > now() - interval '24 hours';

	-- Classe active : visibilité de la ligne au journal du prof (comme record_game_reward)
	select cm.class_id into v_class_id
	from public.class_members cm
	where cm.student_id = p_student_id and cm.status = 'active'
	limit 1;

	for v_row in
		select m.notion_id, m.best_stage, m.starred_grades, m.rewarded_stage, m.rewarded_grades,
			n.name as notion_name
		from public.student_mathoux m
		join public.classification_nodes n on n.id = m.notion_id
		where m.student_id = p_student_id
			and (
				m.rewarded_stage is distinct from m.best_stage
				or not (m.starred_grades <@ m.rewarded_grades)
			)
		order by m.first_seen_at, m.notion_id
		for update of m
	loop
		v_name := left(coalesce(nullif(btrim(p_names ->> v_row.notion_id::text), ''),
			'Mathou « ' || v_row.notion_name || ' »'), 80);
		v_from := coalesce(array_position(v_stages, v_row.rewarded_stage), 0);
		v_to := array_position(v_stages, v_row.best_stage);
		v_paid_rank := v_from;
		v_paid_grades := v_row.rewarded_grades;
		v_blocked := false;

		-- Étapes de stade franchies depuis le dernier versement, dans l'ordre ; la
		-- première qui dépasse le plafond arrête ce Mathou (jamais d'étape coupée)
		for v_rank in (v_from + 1)..v_to loop
			if v_used + v_stage_rewards[v_rank] > v_cap then
				v_blocked := true;
				exit;
			end if;
			notion_id := v_row.notion_id;
			delta := v_stage_rewards[v_rank];
			reason := v_prefix || case v_rank
				when 1 then 'naissance de ' || v_name
				when 2 then v_name || ' devient matou'
				else v_name || ' devient grand matou'
			end;
			v_used := v_used + delta;
			v_total := v_total + delta;
			v_paid_rank := v_rank;
			insert into public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
			values (p_student_id, v_class_id, delta, reason, null);
			return next;
		end loop;

		-- Étoiles pas encore payées (après les stades de ce Mathou)
		if not v_blocked then
			for v_grade in
				-- distinct : l'unicité des étoiles est à la charge du serveur, pas d'un CHECK
				select distinct g from unnest(v_row.starred_grades) as g
				where not (g = any (v_row.rewarded_grades))
				order by g
			loop
				exit when v_used + v_star_reward > v_cap;
				notion_id := v_row.notion_id;
				delta := v_star_reward;
				reason := v_prefix || v_name || ' gagne une étoile';
				v_used := v_used + delta;
				v_total := v_total + delta;
				v_paid_grades := v_paid_grades || v_grade;
				insert into public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
				values (p_student_id, v_class_id, delta, reason, null);
				return next;
			end loop;
		end if;

		-- Ce qui a été payé, jamais en baisse ; rien de payé → ligne inchangée
		if v_paid_rank > v_from or cardinality(v_paid_grades) > cardinality(v_row.rewarded_grades) then
			update public.student_mathoux m
			-- v_paid_rank ≥ v_from ; un stade payé déjà au-dessus du meilleur ne redescend pas
			set rewarded_stage = coalesce(v_stages[v_paid_rank], v_row.rewarded_stage),
				rewarded_grades = array(
					select distinct g from unnest(v_paid_grades) as g order by g
				)
			where m.student_id = p_student_id and m.notion_id = v_row.notion_id;
		end if;
	end loop;

	if v_total > 0 then
		update public.profiles
		set gidouilles = coalesce(gidouilles, 0) + v_total
		where id = p_student_id;
	end if;
end;
$function$;

comment on function public.pay_mathou_milestones(uuid, jsonb) is
	'Verse les gidouilles des étapes de la Chatterie pas encore payées (naissance 3, matou 5, grand matou 10, étoile 5), une fois chacune, 20 au plus sur 24 heures glissantes (libellés « Chatterie : … »). Serveur seul (service_role).';
