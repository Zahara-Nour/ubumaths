-- Adopter : un élément propre au chapitre devient un lien vers le modèle (ADR 0029, étape 3a)
-- ==============================================================================
--
-- Quand un chapitre devient la source d'un modèle (« Faire un modèle », reprise du
-- chapitre de 1SPE du 2026-09-13), ses éléments deviennent des lignes de lien SANS
-- CHANGER D'IDENTIFIANT : les cases cochées des élèves (`student_checklist_progress`
-- les désigne par identifiant) et les dates de publication restent. Le contenu
-- devient celui du modèle (le chemin du fichier pointe la copie du modèle).
--
-- QUI POURRA LIRE QUOI, QU'IL NE POUVAIT PAS LIRE AVANT : personne. Seule la garde
-- `modele_lien_garde` change : l'adoption, refusée jusqu'ici, est permise vers un
-- élément d'un modèle LISIBLE par l'appelant (RLS) auquel le chapitre est lié et non
-- détaché — les mêmes conditions que la création d'une ligne de lien
-- (`modele_lien_remplir`). L'ordre, la section, la publication et le masquage
-- restent ceux du chapitre. Les élèves n'écrivent pas ces tables (aucune policy).
--
-- Refusé aussi : adopter un élément RETIRÉ du modèle, et transformer une ligne du
-- modèle en lien (revue de sécurité du 2026-10-14, mineurs 1 et 2).
--
-- Additive : remplacement d'une fonction de déclencheur ; aucune donnée touchée.
--
-- ROLLBACK:BEGIN
-- Rejouer la définition de `public.modele_lien_garde()` de
-- 20261016103300_modele_possede_son_contenu.sql (section 3b).
-- ROLLBACK:END

create or replace function public.modele_lien_garde()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
	v_old jsonb := to_jsonb(old);
	v_new jsonb := to_jsonb(new);
	v_src jsonb;
begin
	-- Adopter : propre → lien. Mêmes conditions que la création d'un lien, à toute
	-- profondeur de déclencheur (aucune cascade n'adopte sans contrôle).
	if old.source_id is null and new.source_id is not null then
		execute format('select to_jsonb(s) from public.%I s where s.id = $1', tg_table_name)
			into v_src using new.source_id;

		-- Une ligne du MODÈLE ne devient pas un lien (elle sortirait du modèle).
		if old.template_id is not null then
			raise exception 'Lien refusé : un élément du modèle ne se relie pas.'
				using errcode = 'check_violation';
		end if;

		if v_src is null or v_src->>'template_id' is null or v_src->>'retired_at' is not null then
			raise exception 'Lien refusé : la source n''est pas un élément actif d''un modèle.'
				using errcode = 'foreign_key_violation';
		end if;

		if not exists (
			select 1 from public.chapter_template_instantiations i
			where i.chapter_id = new.chapter_id
				and i.template_id = (v_src->>'template_id')::uuid
				and not i.is_detached
		) then
			raise exception 'Lien refusé : ce chapitre n''est pas lié à ce modèle.'
				using errcode = 'insufficient_privilege';
		end if;

		-- Le contenu vient du modèle ; tout le reste (ordre, section, publication)
		-- reste au chapitre.
		return jsonb_populate_record(
			new,
			(select jsonb_object_agg(k, v_src->k) from unnest(tg_argv) k where v_src ? k)
		);
	end if;

	-- Les recopies du modèle (`modele_recopier`) passent : elles changent le contenu
	-- d'une ligne de lien, c'est leur rôle.
	if pg_trigger_depth() > 1 then
		return new;
	end if;

	if old.source_id is not null and new.source_id is not null then
		if new.source_id <> old.source_id or exists (
			select 1 from unnest(tg_argv) k where v_new->k is distinct from v_old->k
		) then
			raise exception 'Élément du modèle : il se corrige dans le modèle, pas dans le chapitre.'
				using errcode = 'check_violation';
		end if;
	end if;

	return new;
end;
$$;
