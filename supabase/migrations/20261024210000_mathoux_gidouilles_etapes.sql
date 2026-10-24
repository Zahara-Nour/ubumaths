-- Mathoux : les étapes de la collection rapportent des gidouilles
-- ==============================================================================
--
-- Phase 0 validée par David le 2026-10-24 (docs/wip/mathoux-accessoires-progress.md,
-- lot A) : le travail mathématique rapporte enfin des gidouilles, une fois par
-- étape franchie de la Chatterie, jamais deux :
--   naissance (chaton) +3 · matou +5 · grand matou +10 · étoile de classe +5.
-- Un Mathou qui s'endort, se réveille ou dont un point change de tagage ne repaie
-- rien : on paie la mémoire (`best_stage`, `starred_grades`, qui ne baissent
-- jamais), et on retient ce qui a été payé (`rewarded_stage`, `rewarded_grades`).
-- Rattrapage (validé) : une ligne existante n'a encore rien de payé ; le premier
-- versement paie tout ce qu'elle a déjà atteint (nul en prod le 2026-10-24 :
-- aucune ligne `student_mathoux`).
--
-- QUESTION D'ACCÈS (tranchée par David le 2026-10-24) : personne ne lit rien de
-- neuf. Les deux colonnes suivent les règles de la table : l'élève lit ses lignes,
-- le prof celles de ses élèves, l'admin tout ; elles disent ce qui a déjà été
-- payé, que le stade et les étoiles disent déjà. Personne n'écrit au client
-- connecté (`authenticated` n'a que SELECT sur la table). La fonction de
-- versement n'est exécutable que par `service_role` (droits ET garde dans le
-- corps). Personne ne perd d'accès : rien n'est retiré.
--
-- Atomicité : `pay_mathou_milestones` verrouille les lignes de l'élève
-- (FOR UPDATE), puis, dans la même transaction, marque ce qui est payé, crédite
-- `profiles.gidouilles` et écrit une ligne `gidouilles_activity` par étape (le
-- trigger existant la recopie dans `reward_events`, lu par le journal des
-- récompenses). Deux versements simultanés : le second attend le verrou et ne
-- trouve plus rien à payer.
--
-- Additive : deux colonnes avec défaut et une fonction neuve, rien d'existant
-- n'est modifié ni perdu.
--
-- Preuve : tests/integration/mathoux-gidouilles-etapes.test.ts.
--
-- ROLLBACK (à exécuter tel quel) :
--   drop function if exists public.pay_mathou_milestones(uuid, jsonb);
--   alter table public.student_mathoux drop column if exists rewarded_stage;
--   alter table public.student_mathoux drop column if exists rewarded_grades;
--   (les gidouilles déjà versées restent versées, avec leur ligne au journal.)

-- ---------------------------------------------------------------------------
-- 1. Ce qui a été payé
-- ---------------------------------------------------------------------------

alter table public.student_mathoux
	add column rewarded_stage text,
	add column rewarded_grades text[] not null default '{}';

alter table public.student_mathoux
	add constraint student_mathoux_rewarded_stage_check
		check (rewarded_stage is null or rewarded_stage in ('chaton', 'matou', 'grand_matou')),
	add constraint student_mathoux_rewarded_grades_check
		check (
			cardinality(rewarded_grades) <= 20
			and array_position(rewarded_grades, null) is null
			and public.is_valid_grade_array(rewarded_grades)
		);

comment on column public.student_mathoux.rewarded_stage is
	'Dernier stade payé en gidouilles (NULL : rien payé). Écrit par pay_mathou_milestones seule.';
comment on column public.student_mathoux.rewarded_grades is
	'Niveaux étoilés déjà payés en gidouilles. Écrit par pay_mathou_milestones seule.';

-- ---------------------------------------------------------------------------
-- 2. Le versement
-- ---------------------------------------------------------------------------
-- p_names : nom affiché de chaque Mathou ({ "<notion_id>": "Tangentin" }), fourni
-- par le serveur (`mathouName`, table des noms propres côté TypeScript) ; à défaut,
-- le nom de la notion. Sert seulement au libellé du journal, tronqué à 80 signes.
-- Rend une ligne par étape payée (vide s'il n'y a rien à payer).

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
	v_row record;
	v_name text;
	v_from integer;
	v_to integer;
	v_rank integer;
	v_grade text;
	v_total integer := 0;
	v_class_id uuid;
begin
	-- Serveur seul (en plus des droits d'exécution, retirés à tous sauf service_role)
	if coalesce((select auth.role()), '') <> 'service_role' then
		raise exception 'Non autorisé : versement réservé au serveur'
			using errcode = '42501';
	end if;

	if not exists (select 1 from public.profiles p where p.id = p_student_id and p.role = 'student') then
		raise exception 'Élève introuvable : %', p_student_id;
	end if;

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

		-- Étapes de stade franchies depuis le dernier versement, dans l'ordre
		for v_rank in (v_from + 1)..v_to loop
			notion_id := v_row.notion_id;
			delta := v_stage_rewards[v_rank];
			reason := case v_rank
				when 1 then 'Naissance de ' || v_name
				when 2 then v_name || ' devient matou'
				else v_name || ' devient grand matou'
			end;
			v_total := v_total + delta;
			insert into public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
			values (p_student_id, v_class_id, delta, reason, null);
			return next;
		end loop;

		-- Étoiles pas encore payées
		for v_grade in
			-- distinct : l'unicité des étoiles est à la charge du serveur, pas d'un CHECK
			select distinct g from unnest(v_row.starred_grades) as g
			where not (g = any (v_row.rewarded_grades))
			order by g
		loop
			notion_id := v_row.notion_id;
			delta := v_star_reward;
			reason := v_name || ' gagne une étoile';
			v_total := v_total + delta;
			insert into public.gidouilles_activity (student_id, class_id, delta, reason, created_by)
			values (p_student_id, v_class_id, delta, reason, null);
			return next;
		end loop;

		update public.student_mathoux m
		-- Jamais en baisse : un stade corrigé à la main sous le payé ne ferait pas repayer
		set rewarded_stage = v_stages[greatest(v_from, v_to)],
			rewarded_grades = array(
				select distinct g from unnest(v_row.rewarded_grades || v_row.starred_grades) as g order by g
			)
		where m.student_id = p_student_id and m.notion_id = v_row.notion_id;
	end loop;

	if v_total > 0 then
		update public.profiles
		set gidouilles = coalesce(gidouilles, 0) + v_total
		where id = p_student_id;
	end if;
end;
$function$;

comment on function public.pay_mathou_milestones(uuid, jsonb) is
	'Verse les gidouilles des étapes de la Chatterie pas encore payées (naissance 3, matou 5, grand matou 10, étoile 5), une fois chacune. Serveur seul (service_role).';

revoke all on function public.pay_mathou_milestones(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.pay_mathou_milestones(uuid, jsonb) to service_role;
